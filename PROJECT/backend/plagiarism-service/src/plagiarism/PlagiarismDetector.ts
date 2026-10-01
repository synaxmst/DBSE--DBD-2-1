import { Submission, ISubmission } from '../models/Submission';
import { Problem } from '../models/Problem';
import { User } from '../models/User';
import { PlagiarismReport, ISuspiciousMatch } from '../models/PlagiarismReport';
import { tokenize } from './Tokenizer';
import { generateNgrams, winnow, jaccardSimilarity } from './Fingerprinter';
import { logger } from '../logger';

export interface ComparisonResult {
  submission1Id: string;
  submission2Id: string;
  user1Id: string;
  user2Id: string;
  user1Username: string;
  user2Username: string;
  problemId: string;
  problemTitle: string;
  language: string;
  similarity: number;
  matchedTokensCount: number;
}

export class PlagiarismDetector {
  /**
   * Run full plagiarism detection across all Accepted submissions in a contest
   */
  public async analyzeContest(
    contestId: string,
    threshold: number = 0.7
  ): Promise<{
    contestId: string;
    analyzedSubmissionsCount: number;
    flaggedPairsCount: number;
    matches: ISuspiciousMatch[];
  }> {
    logger.info(`[Plagiarism Detector] Starting full contest analysis for contest ${contestId} (Threshold: ${threshold * 100}%)...`);

    // 1. Fetch all Accepted submissions for this contest
    const submissions = await Submission.find({
      contestId,
      verdict: 'Accepted',
    }).populate('userId', 'username name');

    if (submissions.length === 0) {
      return {
        contestId,
        analyzedSubmissionsCount: 0,
        flaggedPairsCount: 0,
        matches: [],
      };
    }

    // 2. Group submissions by problemId
    const problemGroups = new Map<string, ISubmission[]>();
    for (const sub of submissions) {
      const pId = sub.problemId.toString();
      if (!problemGroups.has(pId)) {
        problemGroups.set(pId, []);
      }
      problemGroups.get(pId)!.push(sub);
    }

    const matches: ISuspiciousMatch[] = [];

    // 3. Perform pairwise comparison per problem group
    for (const [problemId, group] of problemGroups.entries()) {
      // Precompute token fingerprints for all submissions in this problem
      const fingerprintData = group.map((sub) => {
        const tokens = tokenize(sub.code, sub.language);
        const ngrams = generateNgrams(tokens, 5);
        const fingerprint = winnow(ngrams, 4);
        return {
          submission: sub,
          tokens,
          fingerprint,
        };
      });

      // Compare all unique participant pairs
      for (let i = 0; i < fingerprintData.length; i++) {
        for (let j = i + 1; j < fingerprintData.length; j++) {
          const item1 = fingerprintData[i];
          const item2 = fingerprintData[j];

          // Skip comparisons between the same user's multiple submissions
          if (item1.submission.userId.toString() === item2.submission.userId.toString()) {
            continue;
          }

          const similarity = jaccardSimilarity(item1.fingerprint, item2.fingerprint);

          if (similarity >= threshold) {
            // Count intersection
            let intersectionCount = 0;
            for (const h of item1.fingerprint) {
              if (item2.fingerprint.has(h)) intersectionCount++;
            }

            const match: ISuspiciousMatch = {
              submission1Id: item1.submission._id,
              submission2Id: item2.submission._id,
              user1Id: item1.submission.userId as any,
              user2Id: item2.submission.userId as any,
              user1Username: item1.submission.username || (item1.submission.userId as any)?.username || 'User 1',
              user2Username: item2.submission.username || (item2.submission.userId as any)?.username || 'User 2',
              problemId: item1.submission.problemId,
              problemTitle: item1.submission.problemTitle || 'Problem',
              language: item1.submission.language,
              similarity,
              matchedTokensCount: intersectionCount,
              flaggedAt: new Date(),
            };

            matches.push(match);
            logger.info(`[Plagiarism Detected] ⚠️ Flagged: ${match.user1Username} vs ${match.user2Username} on problem ${problemId} (Similarity: ${(similarity * 100).toFixed(1)}%)`);
          }
        }
      }
    }

    // 4. Save analysis report to MongoDB
    await PlagiarismReport.findOneAndUpdate(
      { contestId },
      {
        contestId,
        analyzedSubmissionsCount: submissions.length,
        flaggedPairsCount: matches.length,
        matches,
        similarityThreshold: threshold,
        status: 'completed',
      },
      { upsert: true, new: true }
    );

    logger.info(`[Plagiarism Detector] Completed analysis for contest ${contestId}. Flagged ${matches.length} suspicious submission pairs.`);

    return {
      contestId,
      analyzedSubmissionsCount: submissions.length,
      flaggedPairsCount: matches.length,
      matches,
    };
  }

  /**
   * Check a single submission against other Accepted submissions for the same problem
   */
  public async checkSubmission(
    submissionId: string,
    threshold: number = 0.7
  ): Promise<{
    targetSubmissionId: string;
    flaggedMatches: ComparisonResult[];
  }> {
    const targetSub = await Submission.findById(submissionId).populate('userId', 'username name');
    if (!targetSub) {
      throw new Error(`Submission ${submissionId} not found.`);
    }

    // Tokenize target code
    const targetTokens = tokenize(targetSub.code, targetSub.language);
    const targetNgrams = generateNgrams(targetTokens, 5);
    const targetFingerprint = winnow(targetNgrams, 4);

    // Fetch comparison candidate submissions
    const candidates = await Submission.find({
      problemId: targetSub.problemId,
      _id: { $ne: targetSub._id },
      userId: { $ne: targetSub.userId },
      verdict: 'Accepted',
      ...(targetSub.contestId && { contestId: targetSub.contestId }),
    }).populate('userId', 'username name');

    const flaggedMatches: ComparisonResult[] = [];

    for (const cand of candidates) {
      const candTokens = tokenize(cand.code, cand.language);
      const candNgrams = generateNgrams(candTokens, 5);
      const candFingerprint = winnow(candNgrams, 4);

      const similarity = jaccardSimilarity(targetFingerprint, candFingerprint);

      if (similarity >= threshold) {
        let intersectionCount = 0;
        for (const h of targetFingerprint) {
          if (candFingerprint.has(h)) intersectionCount++;
        }

        flaggedMatches.push({
          submission1Id: targetSub._id.toString(),
          submission2Id: cand._id.toString(),
          user1Id: targetSub.userId.toString(),
          user2Id: cand.userId.toString(),
          user1Username: targetSub.username || (targetSub.userId as any)?.username || 'User 1',
          user2Username: cand.username || (cand.userId as any)?.username || 'User 2',
          problemId: targetSub.problemId.toString(),
          problemTitle: targetSub.problemTitle || 'Problem',
          language: targetSub.language,
          similarity,
          matchedTokensCount: intersectionCount,
        });
      }
    }

    return {
      targetSubmissionId: submissionId,
      flaggedMatches,
    };
  }
}

export const plagiarismDetector = new PlagiarismDetector();
