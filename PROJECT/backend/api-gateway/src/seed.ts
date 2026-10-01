import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User } from './models/User';
import { Problem } from './models/Problem';
import { Contest } from './models/Contest';
import { Submission } from './models/Submission';
import { logger } from './logger';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/algoflow';

async function seedDatabase() {
  try {
    logger.info(`[Seed] Connecting to MongoDB at ${MONGO_URI}...`);
    await mongoose.connect(MONGO_URI);
    logger.info('[Seed] Connected to MongoDB.');

    // 1. Clear existing collections
    logger.info('[Seed] Clearing existing collections...');
    await Promise.all([
      User.deleteMany({}),
      Problem.deleteMany({}),
      Contest.deleteMany({}),
      Submission.deleteMany({}),
    ]);
    logger.info('[Seed] Collections cleared.');

    // 2. Hash passwords
    const salt = await bcrypt.genSalt(10);
    const adminPasswordHash = await bcrypt.hash('Admin@123', salt);
    const setterPasswordHash = await bcrypt.hash('Setter@123', salt);
    const userPasswordHash = await bcrypt.hash('User@123', salt);

    // 3. Create Users
    logger.info('[Seed] Creating users...');
    const [adminUser, setterUser, regularUser] = await User.create([
      {
        username: 'admin',
        name: 'System Admin',
        email: 'admin@codejudge.com',
        passwordHash: adminPasswordHash,
        role: 'admin',
        rating: 2100,
        rank: 1,
        easySolved: 120,
        mediumSolved: 95,
        hardSolved: 45,
        institution: 'AlgoFlow HQ',
      },
      {
        username: 'setter',
        name: 'Problem Setter',
        email: 'setter@codejudge.com',
        passwordHash: setterPasswordHash,
        role: 'setter',
        rating: 1950,
        rank: 42,
        easySolved: 90,
        mediumSolved: 75,
        hardSolved: 30,
        institution: 'Stanford University',
      },
      {
        username: 'bhargava',
        name: 'Bhargava',
        email: 'bhargava@codejudge.com',
        passwordHash: userPasswordHash,
        role: 'user',
        rating: 1650,
        rank: 210,
        easySolved: 35,
        mediumSolved: 20,
        hardSolved: 5,
        institution: 'MIT',
      },
    ]);
    logger.info(`[Seed] Created ${[adminUser, setterUser, regularUser].length} users.`);

    // 4. Create 5 Problems
    logger.info('[Seed] Creating problems...');
    const problemsData = [
      {
        title: 'Two Sum',
        slug: 'two-sum',
        difficulty: 'Easy' as const,
        timeLimitMs: 1000,
        memoryLimitMb: 128,
        tags: ['Array', 'Hash Table'],
        submissionsCount: 489210,
        totalAccepted: 251454,
        authorId: setterUser._id,
        authorName: setterUser.name,
        status: 'published' as const,
        isPublished: true,
        description: `Given an array of integers \`nums\` and an integer \`target\`, return indices of the two numbers such that they add up to \`target\`.

You may assume that each input would have **exactly one solution**, and you may not use the same element twice.

You can return the answer in any order.`,
        constraints: [
          '2 <= nums.length <= 10^4',
          '-10^9 <= nums[i] <= 10^9',
          '-10^9 <= target <= 10^9',
          'Only one valid answer exists.',
        ],
        sampleTestCases: [
          {
            input: '4\n2 7 11 15\n9',
            expectedOutput: '0 1',
            explanation: 'nums[0] + nums[1] == 2 + 7 == 9, so we return [0, 1].',
          },
          {
            input: '3\n3 2 4\n6',
            expectedOutput: '1 2',
            explanation: 'nums[1] + nums[2] == 2 + 4 == 6, so we return [1, 2].',
          },
          {
            input: '2\n3 3\n6',
            expectedOutput: '0 1',
            explanation: 'nums[0] + nums[1] == 3 + 3 == 6, so we return [0, 1].',
          },
        ],
        hiddenTestCases: [
          {
            input: '5\n1 5 8 11 14\n19',
            expectedOutput: '2 3',
          },
          {
            input: '4\n-3 4 3 90\n0',
            expectedOutput: '0 2',
          },
        ],
        starterCode: {
          cpp: `#include <iostream>
#include <vector>
#include <unordered_map>

int main() {
    int n;
    if (!(std::cin >> n)) return 0;
    std::vector<int> nums(n);
    for (int i = 0; i < n; i++) std::cin >> nums[i];
    int target;
    std::cin >> target;

    std::unordered_map<int, int> seen;
    for (int i = 0; i < n; i++) {
        int complement = target - nums[i];
        if (seen.find(complement) != seen.end()) {
            std::cout << seen[complement] << " " << i << std::endl;
            return 0;
        }
        seen[nums[i]] = i;
    }
    return 0;
}`,
          python: `import sys

def solve():
    lines = sys.stdin.read().split()
    if not lines:
        return
    n = int(lines[0])
    nums = [int(x) for x in lines[1:n+1]]
    target = int(lines[n+1])

    seen = {}
    for i, num in enumerate(nums):
        diff = target - num
        if diff in seen:
            print(f"{seen[diff]} {i}")
            return
        seen[num] = i

if __name__ == '__main__':
    solve()`,
          java: `import java.util.Scanner;
import java.util.HashMap;

public class Solution {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (!sc.hasNextInt()) return;
        int n = sc.nextInt();
        int[] nums = new int[n];
        for (int i = 0; i < n; i++) nums[i] = sc.nextInt();
        int target = sc.nextInt();

        HashMap<Integer, Integer> map = new HashMap<>();
        for (int i = 0; i < n; i++) {
            int complement = target - nums[i];
            if (map.containsKey(complement)) {
                System.out.println(map.get(complement) + " " + i);
                return;
            }
            map.put(nums[i], i);
        }
    }
}`,
          javascript: `const fs = require('fs');

function main() {
    const input = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/);
    if (!input || input.length < 2) return;
    const n = parseInt(input[0], 10);
    const nums = input.slice(1, n + 1).map(Number);
    const target = parseInt(input[n + 1], 10);

    const map = new Map();
    for (let i = 0; i < nums.length; i++) {
        const diff = target - nums[i];
        if (map.has(diff)) {
            console.log(\`\${map.get(diff)} \${i}\`);
            return;
        }
        map.set(nums[i], i);
    }
}

main();`,
        },
      },
      {
        title: 'Add Two Numbers',
        slug: 'add-two-numbers',
        difficulty: 'Medium' as const,
        timeLimitMs: 1500,
        memoryLimitMb: 256,
        tags: ['Linked List', 'Math', 'Recursion'],
        submissionsCount: 312000,
        totalAccepted: 131352,
        authorId: setterUser._id,
        authorName: setterUser.name,
        status: 'published' as const,
        isPublished: true,
        description: `You are given two **non-empty** lists representing two non-negative integers. The digits are stored in **reverse order**, and each contains a single digit. Add the two numbers and return the sum as a list.

You may assume the two numbers do not contain any leading zero, except the number 0 itself.`,
        constraints: [
          'The length of each list is in the range [1, 100].',
          '0 <= val <= 9',
          'It is guaranteed that the list represents a number that does not have leading zeros.',
        ],
        sampleTestCases: [
          {
            input: '3\n2 4 3\n3\n5 6 4',
            expectedOutput: '7 0 8',
            explanation: '342 + 465 = 807.',
          },
          {
            input: '1\n0\n1\n0',
            expectedOutput: '0',
            explanation: '0 + 0 = 0.',
          },
        ],
        hiddenTestCases: [
          {
            input: '7\n9 9 9 9 9 9 9\n4\n9 9 9 9',
            expectedOutput: '8 9 9 9 0 0 0 1',
          },
        ],
        starterCode: {
          cpp: `#include <iostream>
#include <vector>

int main() {
    int n, m;
    if (!(std::cin >> n)) return 0;
    std::vector<int> l1(n);
    for (int i = 0; i < n; i++) std::cin >> l1[i];
    std::cin >> m;
    std::vector<int> l2(m);
    for (int i = 0; i < m; i++) std::cin >> l2[i];

    std::vector<int> res;
    int carry = 0, i = 0, j = 0;
    while (i < n || j < m || carry) {
        int sum = carry;
        if (i < n) sum += l1[i++];
        if (j < m) sum += l2[j++];
        carry = sum / 10;
        res.push_back(sum % 10);
    }
    for (int k = 0; k < res.size(); k++) {
        std::cout << res[k] << (k + 1 == res.size() ? "" : " ");
    }
    std::cout << std::endl;
    return 0;
}`,
          python: `import sys

def solve():
    tokens = sys.stdin.read().split()
    if not tokens: return
    n = int(tokens[0])
    l1 = [int(x) for x in tokens[1:n+1]]
    idx = n + 1
    m = int(tokens[idx])
    l2 = [int(x) for x in tokens[idx+1:idx+1+m]]

    res = []
    carry = 0
    i, j = 0, 0
    while i < n or j < m or carry:
        s = carry
        if i < n: s += l1[i]; i += 1
        if j < m: s += l2[j]; j += 1
        carry = s // 10
        res.append(str(s % 10))
    print(" ".join(res))

if __name__ == '__main__':
    solve()`,
          java: `import java.util.Scanner;
import java.util.ArrayList;

public class Solution {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (!sc.hasNextInt()) return;
        int n = sc.nextInt();
        int[] l1 = new int[n];
        for (int i = 0; i < n; i++) l1[i] = sc.nextInt();
        int m = sc.nextInt();
        int[] l2 = new int[m];
        for (int i = 0; i < m; i++) l2[i] = sc.nextInt();

        ArrayList<Integer> res = new ArrayList<>();
        int carry = 0, i = 0, j = 0;
        while (i < n || j < m || carry != 0) {
            int sum = carry;
            if (i < n) sum += l1[i++];
            if (j < m) sum += l2[j++];
            carry = sum / 10;
            res.add(sum % 10);
        }
        for (int k = 0; k < res.size(); k++) {
            System.out.print(res.get(k) + (k + 1 == res.size() ? "" : " "));
        }
        System.out.println();
    }
}`,
          javascript: `const fs = require('fs');

function main() {
    const input = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/);
    if (!input || input.length < 2) return;
    const n = parseInt(input[0], 10);
    const l1 = input.slice(1, n + 1).map(Number);
    let idx = n + 1;
    const m = parseInt(input[idx], 10);
    const l2 = input.slice(idx + 1, idx + 1 + m).map(Number);

    const res = [];
    let carry = 0, i = 0, j = 0;
    while (i < n || j < m || carry) {
        let sum = carry;
        if (i < n) sum += l1[i++];
        if (j < m) sum += l2[j++];
        carry = Math.floor(sum / 10);
        res.push(sum % 10);
    }
    console.log(res.join(' '));
}

main();`,
        },
      },
      {
        title: 'Longest Substring Without Repeating Characters',
        slug: 'longest-substring-without-repeating-characters',
        difficulty: 'Medium' as const,
        timeLimitMs: 1000,
        memoryLimitMb: 128,
        tags: ['Hash Table', 'String', 'Sliding Window'],
        submissionsCount: 298400,
        totalAccepted: 103544,
        authorId: setterUser._id,
        authorName: setterUser.name,
        status: 'published' as const,
        isPublished: true,
        description: `Given a string \`s\`, find the length of the **longest substring** without repeating characters.

A **substring** is a contiguous non-empty sequence of characters within a string.`,
        constraints: [
          '0 <= s.length <= 5 * 10^4',
          's consists of English letters, digits, symbols and spaces.',
        ],
        sampleTestCases: [
          {
            input: 'abcabcbb',
            expectedOutput: '3',
            explanation: 'The answer is "abc", with the length of 3.',
          },
          {
            input: 'bbbbb',
            expectedOutput: '1',
            explanation: 'The answer is "b", with the length of 1.',
          },
          {
            input: 'pwwkew',
            expectedOutput: '3',
            explanation: 'The answer is "wke", with the length of 3.',
          },
        ],
        hiddenTestCases: [
          {
            input: 'dvdf',
            expectedOutput: '3',
          },
          {
            input: 'anviaj',
            expectedOutput: '5',
          },
        ],
        starterCode: {
          cpp: `#include <iostream>
#include <string>
#include <unordered_map>
#include <algorithm>

int main() {
    std::string s;
    if (!(std::cin >> s)) {
        std::cout << 0 << std::endl;
        return 0;
    }
    std::unordered_map<char, int> seen;
    int maxLen = 0, left = 0;
    for (int right = 0; right < s.length(); ++right) {
        if (seen.find(s[right]) != seen.end()) {
            left = std::max(left, seen[s[right]] + 1);
        }
        seen[s[right]] = right;
        maxLen = std::max(maxLen, right - left + 1);
    }
    std::cout << maxLen << std::endl;
    return 0;
}`,
          python: `import sys

def solve():
    s = sys.stdin.read().strip()
    if not s:
        print(0)
        return
    seen = {}
    left = 0
    max_len = 0
    for right, char in enumerate(s):
        if char in seen and seen[char] >= left:
            left = seen[char] + 1
        seen[char] = right
        max_len = max(max_len, right - left + 1)
    print(max_len)

if __name__ == '__main__':
    solve()`,
          java: `import java.util.Scanner;
import java.util.HashMap;

public class Solution {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (!sc.hasNext()) {
            System.out.println(0);
            return;
        }
        String s = sc.next();
        HashMap<Character, Integer> map = new HashMap<>();
        int left = 0, maxLen = 0;
        for (int right = 0; right < s.length(); right++) {
            char c = s.charAt(right);
            if (map.containsKey(c)) {
                left = Math.max(left, map.get(c) + 1);
            }
            map.put(c, right);
            maxLen = Math.max(maxLen, right - left + 1);
        }
        System.out.println(maxLen);
    }
}`,
          javascript: `const fs = require('fs');

function main() {
    const s = fs.readFileSync(0, 'utf-8').trim();
    if (!s) {
        console.log(0);
        return;
    }
    const map = new Map();
    let left = 0, maxLen = 0;
    for (let right = 0; right < s.length; right++) {
        if (map.has(s[right])) {
            left = Math.max(left, map.get(s[right]) + 1);
        }
        map.set(s[right], right);
        maxLen = Math.max(maxLen, right - left + 1);
    }
    console.log(maxLen);
}

main();`,
        },
      },
      {
        title: 'Median of Two Sorted Arrays',
        slug: 'median-of-two-sorted-arrays',
        difficulty: 'Hard' as const,
        timeLimitMs: 2000,
        memoryLimitMb: 256,
        tags: ['Array', 'Binary Search', 'Divide and Conquer'],
        submissionsCount: 184500,
        totalAccepted: 71217,
        authorId: setterUser._id,
        authorName: setterUser.name,
        status: 'published' as const,
        isPublished: true,
        description: `Given two sorted arrays \`nums1\` and \`nums2\` of size \`m\` and \`n\` respectively, return **the median** of the two sorted arrays.

The overall run time complexity should be **O(log (m+n))**.`,
        constraints: [
          'nums1.length == m',
          'nums2.length == n',
          '0 <= m <= 1000',
          '0 <= n <= 1000',
          '1 <= m + n <= 2000',
          '-10^6 <= nums1[i], nums2[i] <= 10^6',
        ],
        sampleTestCases: [
          {
            input: '2\n1 3\n1\n2',
            expectedOutput: '2.00000',
            explanation: 'merged array = [1, 2, 3] and median is 2.0.',
          },
          {
            input: '2\n1 2\n2\n3 4',
            expectedOutput: '2.50000',
            explanation: 'merged array = [1, 2, 3, 4] and median is (2 + 3) / 2 = 2.5.',
          },
        ],
        hiddenTestCases: [
          {
            input: '0\n2\n2 3',
            expectedOutput: '2.50000',
          },
        ],
        starterCode: {
          cpp: `#include <iostream>
#include <vector>
#include <iomanip>
#include <algorithm>

int main() {
    int m, n;
    if (!(std::cin >> m)) return 0;
    std::vector<int> nums1(m);
    for (int i = 0; i < m; i++) std::cin >> nums1[i];
    std::cin >> n;
    std::vector<int> nums2(n);
    for (int i = 0; i < n; i++) std::cin >> nums2[i];

    std::vector<int> merged;
    merged.insert(merged.end(), nums1.begin(), nums1.end());
    merged.insert(merged.end(), nums2.begin(), nums2.end());
    std::sort(merged.begin(), merged.end());

    int total = merged.size();
    double median = 0.0;
    if (total % 2 == 1) {
        median = merged[total / 2];
    } else {
        median = (merged[total / 2 - 1] + merged[total / 2]) / 2.0;
    }
    std::cout << std::fixed << std::setprecision(5) << median << std::endl;
    return 0;
}`,
          python: `import sys

def solve():
    tokens = sys.stdin.read().split()
    if not tokens: return
    m = int(tokens[0])
    nums1 = [int(x) for x in tokens[1:m+1]]
    idx = m + 1
    n = int(tokens[idx])
    nums2 = [int(x) for x in tokens[idx+1:idx+1+n]]

    merged = sorted(nums1 + nums2)
    tot = len(merged)
    if tot % 2 == 1:
        med = float(merged[tot // 2])
    else:
        med = (merged[tot // 2 - 1] + merged[tot // 2]) / 2.0
    print(f"{med:.5f}")

if __name__ == '__main__':
    solve()`,
          java: `import java.util.Scanner;
import java.util.Arrays;

public class Solution {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (!sc.hasNextInt()) return;
        int m = sc.nextInt();
        int[] nums1 = new int[m];
        for (int i = 0; i < m; i++) nums1[i] = sc.nextInt();
        int n = sc.nextInt();
        int[] nums2 = new int[n];
        for (int i = 0; i < n; i++) nums2[i] = sc.nextInt();

        int[] merged = new int[m + n];
        System.arraycopy(nums1, 0, merged, 0, m);
        System.arraycopy(nums2, 0, merged, m, n);
        Arrays.sort(merged);

        int total = merged.length;
        double med = (total % 2 == 1)
            ? merged[total / 2]
            : (merged[total / 2 - 1] + merged[total / 2]) / 2.0;

        System.out.printf("%.5f%n", med);
    }
}`,
          javascript: `const fs = require('fs');

function main() {
    const input = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/);
    if (!input || input.length < 2) return;
    const m = parseInt(input[0], 10);
    const nums1 = input.slice(1, m + 1).map(Number);
    let idx = m + 1;
    const n = parseInt(input[idx], 10);
    const nums2 = input.slice(idx + 1, idx + 1 + n).map(Number);

    const merged = [...nums1, ...nums2].sort((a, b) => a - b);
    const total = merged.length;
    let med = 0;
    if (total % 2 === 1) {
        med = merged[Math.floor(total / 2)];
    } else {
        med = (merged[total / 2 - 1] + merged[total / 2]) / 2;
    }
    console.log(med.toFixed(5));
}

main();`,
        },
      },
      {
        title: 'Trapping Rain Water',
        slug: 'trapping-rain-water',
        difficulty: 'Hard' as const,
        timeLimitMs: 1200,
        memoryLimitMb: 128,
        tags: ['Array', 'Two Pointers', 'Dynamic Programming', 'Monotonic Stack'],
        submissionsCount: 245000,
        totalAccepted: 149940,
        authorId: setterUser._id,
        authorName: setterUser.name,
        status: 'published' as const,
        isPublished: true,
        description: `Given \`n\` non-negative integers representing an elevation map where the width of each bar is \`1\`, compute how much water it can trap after raining.`,
        constraints: [
          'n == height.length',
          '1 <= n <= 2 * 10^4',
          '0 <= height[i] <= 10^5',
        ],
        sampleTestCases: [
          {
            input: '12\n0 1 0 2 1 0 1 3 2 1 2 1',
            expectedOutput: '6',
            explanation: '6 units of rain water are trapped in the elevation troughs.',
          },
          {
            input: '6\n4 2 0 3 2 5',
            expectedOutput: '9',
            explanation: '9 units of water are trapped between high boundary elevations.',
          },
        ],
        hiddenTestCases: [
          {
            input: '5\n3 0 0 2 0 4',
            expectedOutput: '10',
          },
        ],
        starterCode: {
          cpp: `#include <iostream>
#include <vector>
#include <algorithm>

int main() {
    int n;
    if (!(std::cin >> n)) return 0;
    std::vector<int> height(n);
    for (int i = 0; i < n; i++) std::cin >> height[i];

    int left = 0, right = n - 1;
    int leftMax = 0, rightMax = 0, water = 0;
    while (left < right) {
        if (height[left] < height[right]) {
            if (height[left] >= leftMax) leftMax = height[left];
            else water += leftMax - height[left];
            left++;
        } else {
            if (height[right] >= rightMax) rightMax = height[right];
            else water += rightMax - height[right];
            right--;
        }
    }
    std::cout << water << std::endl;
    return 0;
}`,
          python: `import sys

def solve():
    tokens = sys.stdin.read().split()
    if not tokens: return
    n = int(tokens[0])
    height = [int(x) for x in tokens[1:n+1]]

    left, right = 0, n - 1
    left_max, right_max = 0, 0
    water = 0
    while left < right:
        if height[left] < height[right]:
            if height[left] >= left_max:
                left_max = height[left]
            else:
                water += left_max - height[left]
            left += 1
        else:
            if height[right] >= right_max:
                right_max = height[right]
            else:
                water += right_max - height[right]
            right -= 1
    print(water)

if __name__ == '__main__':
    solve()`,
          java: `import java.util.Scanner;

public class Solution {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (!sc.hasNextInt()) return;
        int n = sc.nextInt();
        int[] height = new int[n];
        for (int i = 0; i < n; i++) height[i] = sc.nextInt();

        int left = 0, right = n - 1;
        int leftMax = 0, rightMax = 0, water = 0;
        while (left < right) {
            if (height[left] < height[right]) {
                if (height[left] >= leftMax) leftMax = height[left];
                else water += leftMax - height[left];
                left++;
            } else {
                if (height[right] >= rightMax) rightMax = height[right];
                else water += rightMax - height[right];
                right--;
            }
        }
        System.out.println(water);
    }
}`,
          javascript: `const fs = require('fs');

function main() {
    const input = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/);
    if (!input || input.length < 2) return;
    const n = parseInt(input[0], 10);
    const height = input.slice(1, n + 1).map(Number);

    let left = 0, right = n - 1;
    let leftMax = 0, rightMax = 0, water = 0;
    while (left < right) {
        if (height[left] < height[right]) {
            if (height[left] >= leftMax) leftMax = height[left];
            else water += leftMax - height[left];
            left++;
        } else {
            if (height[right] >= rightMax) rightMax = height[right];
            else water += rightMax - height[right];
            right--;
        }
    }
    console.log(water);
}

main();`,
        },
      },
    ];

    const createdProblems = await Problem.insertMany(problemsData);
    logger.info(`[Seed] Created ${createdProblems.length} problems.`);

    // 5. Create 2 Contests
    logger.info('[Seed] Creating contests...');
    const now = Date.now();
    const liveStartTime = new Date(now - 1 * 60 * 60 * 1000); // 1 hour ago
    const liveEndTime = new Date(now + 5 * 60 * 60 * 1000); // 5 hours from now

    const upcomingStartTime = new Date(now + 3 * 24 * 60 * 60 * 1000); // 3 days from now
    const upcomingEndTime = new Date(now + 3 * 24 * 60 * 60 * 1000 + 90 * 60 * 1000); // 90 min duration

    const first3ProblemIds = [
      createdProblems[0]._id,
      createdProblems[1]._id,
      createdProblems[2]._id,
    ];

    const contestsData = [
      {
        title: 'Global CodeSprint 2026',
        slug: 'global-codesprint-2026',
        description: 'Flagship competitive programming round with dynamic ICPC scoreboard scoring.',
        startTime: liveStartTime,
        endTime: liveEndTime,
        durationMinutes: 360,
        status: 'live' as const,
        problemIds: first3ProblemIds,
        registeredUserIds: [adminUser._id, setterUser._id, regularUser._id],
        bannerBadge: 'LIVE NOW • Division 1',
        createdBy: setterUser._id,
      },
      {
        title: 'AlgoFlow Bi-Weekly Contest 88',
        slug: 'algoflow-bi-weekly-88',
        description: 'Bi-weekly rating round open to Division 1 and Division 2 participants.',
        startTime: upcomingStartTime,
        endTime: upcomingEndTime,
        durationMinutes: 90,
        status: 'upcoming' as const,
        problemIds: first3ProblemIds,
        registeredUserIds: [regularUser._id],
        bannerBadge: 'Rated (Div. 1 + Div. 2)',
        createdBy: setterUser._id,
      },
    ];

    const createdContests = await Contest.insertMany(contestsData);
    logger.info(`[Seed] Created ${createdContests.length} contests.`);

    logger.info('Seed complete.');
  } catch (error) {
    logger.error({ err: error }, '[Seed] Error during seeding: ' + (error as any)?.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    logger.info('[Seed] Disconnected from MongoDB.');
  }
}

seedDatabase();
