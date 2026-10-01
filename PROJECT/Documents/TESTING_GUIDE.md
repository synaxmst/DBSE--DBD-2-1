# 🧪 AlgoFlow Testing & Feature Walkthrough Guide

Comprehensive step-by-step verification, end-to-end testing procedures, and feature walkthrough guide for the AlgoFlow distributed online judge platform.

---

## 🚀 Quick Start (Get Running in 2 Minutes)

### 1. Infrastructure Startup

Execute the standard multi-container bootstrap sequence from the repository root:

```bash
# 1. Start all infrastructure daemons and application services in background
docker compose up -d

# 2. Seed database with users, problems, test suites, and contest rounds
docker compose exec api-gateway npm run seed
```

If developing outside Docker containers locally:

```bash
# Terminal 1 — MongoDB & Redis infrastructure
docker compose up -d mongodb redis

# Terminal 2 — API Gateway
cd backend/api-gateway && npm run dev

# Terminal 3 — Contest & WebSocket Service
cd backend/contest-service && npm run dev

# Terminal 4 — Plagiarism Detection Service
cd backend/plagiarism-service && npm run dev

# Terminal 5 — Judge Worker Daemon
cd backend/judge-worker && npm run dev

# Terminal 6 — React Frontend Client
npm run dev
```

### 2. Service Verification Checklist

Run HTTP health check probes against all microservices to confirm operational readiness:

| Service / Component | Health Check URL / Command | Expected Status / Output | Port |
|:---|:---|:---|:---:|
| **Frontend Client** | `http://localhost:3000` or `http://localhost:5173` | HTTP 200 (HTML page renders) | 3000 / 5173 |
| **API Gateway** | `curl http://localhost:4000/health` | `{"service":"api-gateway","status":"ok","mongodb":"connected","redis":"connected"}` | 4000 |
| **Contest Service** | `curl http://localhost:4001/health` | `{"service":"contest-service","status":"ok","mongodb":"connected","redis":"connected"}` | 4001 |
| **Plagiarism Service** | `curl http://localhost:4002/health` | `{"service":"plagiarism-service","status":"ok","mongodb":"connected","redis":"connected"}` | 4002 |
| **Judge Worker** | `curl http://localhost:4003/health` | `{"service":"judge-worker","status":"ok","docker":"connected","redis":"connected"}` | 4003 |
| **MongoDB Database** | `mongosh mongodb://localhost:27017/algoflow --eval "db.adminCommand('ping')"` | `{ ok: 1 }` | 27017 |
| **Redis Broker** | `redis-cli -p 6379 ping` | `PONG` | 6379 |

### 3. Default Seeded Credentials

The database seed populates 3 primary user accounts representing distinct role tiers:

| Role Label | Username | Password | Email | Seed Rating | Primary Permissions |
|:---|:---|:---|:---|:---:|:---|
| **System Admin** | `admin` | `Admin@123` | `admin@codejudge.com` | 2100 | Full access: user management, health monitor, plagiarism scans, problem deletion |
| **Problem Setter** | `setter` | `Setter@123` | `setter@codejudge.com` | 1950 | Authoring access: create/edit problems, contest management, editorial publishing |
| **Contestant** | `bhargava` | `User@123` | `bhargava@codejudge.com` | 1650 | Participant access: code execution, submissions, contest registration, leaderboard |

---

## 👤 Role 1: Contestant (bhargava / User@123)

### Feature 1.1 — Registration & Login

#### Scenario A: Quick Login using Preset Credentials
1. Navigate to `http://localhost:5173/login` in your web browser.
2. Click the **"User (bhargava)"** quick-login card. The form inputs auto-populate with username `bhargava` and password `User@123`.
3. Click **"Sign In"** (or press `Enter`).
4. **Verification**:
   - The user is redirected to `/dashboard`.
   - The navigation bar updates to display `bhargava`, rating `1650`, and rank `#210`.
   - `localStorage` and `sessionStorage` contain valid `algoflow_token` and `algoflow_user` keys.

#### Scenario B: Register a Brand New Account
1. Log out via the profile menu or navigate to `http://localhost:5173/register`.
2. Fill in the registration form:
   - **Username**: `alex_coder`
   - **Full Name**: `Alex Mercer`
   - **Email**: `alex@example.com`
   - **Institution**: `Carnegie Mellon University`
   - **Password**: `SecurePass@2026`
   - **Confirm Password**: `SecurePass@2026`
3. Click **"Create Account"**.
4. **Verification**:
   - HTTP 201 response received from `POST /api/auth/register`.
   - User redirected to `/dashboard` with initial rating `1500`, 0 solved problems, and rank `0`.

---

### Feature 1.2 — Browse & Filter the Problem Catalog

1. Navigate to `/problems` in the navigation header.
2. **Filter by Difficulty**:
   - Click the **"Easy"** badge in the difficulty filter tab.
   - **Expected**: Catalog filters to show only Easy problems (e.g. *Two Sum*).
3. **Filter by Tag**:
   - Click the **"Array"** tag badge.
   - **Expected**: Shows problems categorized under Array (e.g. *Two Sum*, *Median of Two Sorted Arrays*, *Trapping Rain Water*).
4. **Search by Keyword**:
   - In the search bar, type `Two Sum`.
   - **Expected**: Instantly narrows down to the *Two Sum* card.
5. **Acceptance Rate Verification**:
   - Note the metric badge `51.4% Acceptance` on *Two Sum*.
   - **Origin**: Computed directly from MongoDB fields `(totalAccepted / submissionsCount) * 100` (`251,454 / 489,210 = 51.4%`).

---

### Feature 1.3 — Run Code Against Sample Test Cases

1. From the catalog, click **"Two Sum"** to enter the workspace (`/problems/two-sum`).
2. Select **C++** in the language dropdown.

#### Test 1: Correct C++ Solution
3. Paste the following correct C++ hash map solution into the Monaco editor:

```cpp
#include <iostream>
#include <vector>
#include <unordered_map>

int main() {
    std::ios_base::sync_with_stdio(false);
    std::cin.tie(NULL);
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
            std::cout << seen[complement] << " " << i << "\n";
            return 0;
        }
        seen[nums[i]] = i;
    }
    return 0;
}
```

4. Press `Ctrl + Enter` (or click **"Run Code"** in the bottom action bar).
5. **Expected Output**:
   - Bottom console drawer opens to the **"Test Results"** tab.
   - All 3 Sample Test Cases show green **Passed** badges.
   - Test Case 1 output: `0 1`, Test Case 2 output: `1 2`, Test Case 3 output: `0 1`.

#### Test 2: Broken C++ Solution
6. Replace the code in the editor with this broken brute force implementation:

```cpp
#include <iostream>

int main() {
    int n;
    if (std::cin >> n) {
        std::cout << "0 0" << std::endl; // Always outputs incorrect indices
    }
    return 0;
}
```

7. Press `Ctrl + Enter` (or click **"Run Code"**).
8. **Expected Output**:
   - Test Case 1 fails with red **Wrong Answer** badge.
   - **Expected Output**: `0 1` | **Actual Output**: `0 0`.

> **Note on Percentiles**: The runtime percentile banner (*"Faster than N% of submissions"*) queries `GET /api/problems/:id/stats` and renders only when verified submissions exist in the database.

---

### Feature 1.4 — Submit a Solution (Full Judge Pipeline)

> **Prerequisite**: Docker Engine must be running. The `judge-worker` container or daemon evaluates untrusted binaries inside ephemeral Docker sandbox containers (`gcc:13-bookworm`, `python:3.11-slim`, `openjdk:17-slim`, `node:20-slim`).

1. Open `/problems/two-sum`.
2. Ensure language is set to **Python** (or **C++**).
3. Click **"Submit"** (or press `Ctrl + Shift + Enter`).

#### Pipeline State Transitions in UI:
```
[ Pending ] ──► [ Running ] ──► [ Accepted ] (or WA / TLE / RE)
```

| Submitted Variant | Code to Paste | Expected Verdict | UI Indicator |
|:---|:---|:---:|:---|
| **Accepted (Python)** | Paste [Python Solution](#python-311-solution) | `Accepted` | Green `Accepted` badge, execution time (e.g. `48ms`), memory (e.g. `14200 KB`), passed `5/5` test cases |
| **Wrong Answer** | `print("-1 -1")` | `Wrong Answer` | Red `Wrong Answer` badge, failed on test case 1 |
| **Time Limit Exceeded** | `import time; time.sleep(5)` | `Time Limit Exceeded` | Amber `Time Limit Exceeded` badge, runtime exceeded `1000ms` limit |
| **Runtime Error** | `nums = []; print(nums[999])` | `Runtime Error` | Red `Runtime Error` badge, stack trace: `IndexError: list index out of range` |
| **Compilation Error (C++)** | `int main() { syntax_error; }` | `Compilation Error` | Amber `Compilation Error` badge, compiler log displaying syntax error |

---

### Feature 1.5 — Submit Solutions in Multiple Languages

Use the following exact copy-paste working solutions for **Two Sum** across all 4 supported runtimes:

#### 1. C++ (GCC 13 / C++20)
- **Time Complexity**: $O(N)$
- **Expected Runtime**: 2ms – 15ms | **Expected Memory**: 8,000 KB – 12,000 KB

```cpp
#include <iostream>
#include <vector>
#include <unordered_map>

int main() {
    std::ios_base::sync_with_stdio(false);
    std::cin.tie(NULL);
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
            std::cout << seen[complement] << " " << i << "\n";
            return 0;
        }
        seen[nums[i]] = i;
    }
    return 0;
}
```

#### 2. Python (3.11)
- **Time Complexity**: $O(N)$
- **Expected Runtime**: 35ms – 75ms | **Expected Memory**: 13,000 KB – 16,000 KB

```python
import sys

def solve():
    raw = sys.stdin.read().split()
    if not raw:
        return
    n = int(raw[0])
    nums = [int(x) for x in raw[1:n+1]]
    target = int(raw[n+1])

    seen = {}
    for i, num in enumerate(nums):
        diff = target - num
        if diff in seen:
            print(f"{seen[diff]} {i}")
            return
        seen[num] = i

if __name__ == '__main__':
    solve()
```

#### 3. Java (OpenJDK 17)
- **Requirement**: Must declare class as `public class Solution` with standard `public static void main(String[] args)`.
- **Expected Runtime**: 80ms – 180ms | **Expected Memory**: 28,000 KB – 38,000 KB

```java
import java.util.Scanner;
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
}
```

#### 4. JavaScript (Node.js 20 LTS)
- **Requirement**: Reads standard input via `fs.readFileSync(0, 'utf-8')`.
- **Expected Runtime**: 45ms – 90ms | **Expected Memory**: 22,000 KB – 30,000 KB

```javascript
const fs = require('fs');

function main() {
    const input = fs.readFileSync(0, 'utf-8').trim().split(/\s+/);
    if (!input || input.length < 2) return;
    const n = parseInt(input[0], 10);
    const nums = input.slice(1, n + 1).map(Number);
    const target = parseInt(input[n + 1], 10);

    const map = new Map();
    for (let i = 0; i < nums.length; i++) {
        const diff = target - nums[i];
        if (map.has(diff)) {
            console.log(`${map.get(diff)} ${i}`);
            return;
        }
        map.set(nums[i], i);
    }
}

main();
```

---

### Feature 1.6 — View Submission History

1. **In Problem Workspace**:
   - In `/problems/two-sum`, click the **"Submissions"** tab on the left description panel.
   - Shows chronological list of your submissions for *Two Sum*.
2. **Platform-Wide Submissions View**:
   - Navigate to `/submissions` via the navigation menu.
   - **Columns Rendered**:
     - **Status / Verdict**: Color-coded badge (`Accepted` in green, `Wrong Answer` in red).
     - **Problem**: Clickable problem title link.
     - **Language**: Runtimes tagged with badges (`C++`, `Python`, `Java`, `JavaScript`).
     - **Runtime & Memory**: Exact execution duration (`ms`) and resident memory (`KB`).
     - **Time**: Relative submission timestamp.
3. **Inspect Submission Modal**:
   - Click any submission row.
   - Inspect modal opens displaying the exact source code submitted, raw compiler/stdout output, and memory statistics.

---

### Feature 1.7 — Register & Compete in a Contest

1. Navigate to `/contests`.
2. Locate the seeded live tournament: **Global CodeSprint 2026** (`LIVE NOW • Division 1`).
3. Click **"Register"** (if not already registered). The button changes to a green checked state **"Registered"**.
4. Click on the contest title or click **"Tournament Standings"** to navigate to `/contests/global-codesprint-2026`.
5. **Scoreboard Structure**:
   - Real-time leaderboard table with Rank, Contestant handle, Solved count, Total Penalty, and Problem columns (**A**, **B**, **C**).
6. **Submit Inside a Contest**:
   - Click Problem **A** (*Two Sum*).
   - Submit the working Python solution.
   - **Expected**: Submission is recorded with `contestId` attached.
7. **Real-Time WebSocket Updates**:
   - The scoreboard updates without page refresh via Socket.io event `contest:leaderboard_update`.
8. **ICPC Penalty Rule Calculation**:
   - **Solved Problem Penalty** = `Minutes from contest start time until first Accepted submission` + `(20 minutes × Number of rejected submissions before Accepted)`.
   - *Example*: An Accepted solution at minute 14 with 2 prior Wrong Answers incurs `14 + (2 × 20) = 54 minutes` total penalty.

---

### Feature 1.8 — Use the Algorithm Visualizer

1. In `/problems/two-sum`, click the **"Visualizer"** button in the top-right toolbar (or press the `V` key while outside the code editor).
2. The **Algorithm Visualizer** modal opens automatically configured with the **Two Pointers / Hash Map** pattern.
3. **Step Through Execution**:
   - Click **"Play"** for automatic step traversal, or click **"Next Step (→)"** to step manually.
   - **Visual State Highlights**:
     - Array cells highlight `i` (current element) and `target - nums[i]` (complement).
     - The Hash Map table visually populates with `{ key: num, value: index }` entries.
     - Upon finding match `seen[7] == 0` when visiting `nums[1] = 7`, the target match glows in green.
4. Press `Escape` or click `✕` to close the visualizer.

---

### Feature 1.9 — Use the Stress Tester

1. In `/problems/two-sum`, click the **"Stress Tester"** button in the top-right toolbar (or press the `S` key).
2. The **Differential Stress Tester** drawer opens.
3. **Configuration**:
   - **Generator**: Automatically selects `Two Sum Generator`.
   - **Test Count**: `50` tests.
   - **Array Size Range**: Min `2`, Max `10`.
   - **Value Range**: `-100` to `100`.
4. **Run Stress Test**:
   - Click **"Start Stress Test"**.
   - The engine generates 50 randomized test cases and executes your active solution against the reference $O(N^2)$ brute-force implementation in JavaScript.
5. **Differential Output Analysis**:
   - If a test fails, the drawer pauses immediately on the counterexample test case showing:
     - Exact generated Input
     - Your Solution Output
     - Reference Solution Output
   - Click **"Apply to Console"** to load the failing input directly into your custom test case runner for debugging.

---

### Feature 1.10 — User Dashboard

1. Navigate to `/dashboard`.
2. **Key Metric Cards**:
   - **Global Rating**: `1650` (Division 2).
   - **Global Rank**: `#210`.
   - **Problems Solved**: Categorized breakdown with visual progress bars:
     - **Easy**: `35`
     - **Medium**: `20`
     - **Hard**: `5`
3. **Activity Heatmap**:
   - Interactive calendar grid visualizing daily submission activity and streaks over the past 365 days.
4. **Recent Submissions Feed**:
   - Displays the latest 10 submissions with status badges and language indicators.

---

## 🔧 Role 2: Problem Setter (setter / Setter@123)

### Feature 2.1 — Create a New Problem (Full Walkthrough)

1. Log in with setter credentials: `setter` / `Setter@123`.
2. Click **"Author Problem"** in the navigation header or navigate to `/problems/create`.
3. Fill in the unified problem creation form with the following mock data:

#### Problem Meta Details
- **Title**: `Valid Anagram`
- **Slug**: `valid-anagram`
- **Difficulty**: `Easy`
- **Time Limit (ms)**: `1000`
- **Memory Limit (MB)**: `128`
- **Tags**: Add `String`, `Hash Table`, `Sorting`
- **Constraints**: Add:
  - `1 <= s.length, t.length <= 5 * 10^4`
  - `s and t consist of lowercase English letters.`

#### Description (Markdown)
```markdown
Given two strings `s` and `t`, return `true` if `t` is an **anagram** of `s`, and `false` otherwise.

An **anagram** is a word or phrase formed by rearranging the letters of a different word or phrase, typically using all the original letters exactly once.
```

#### Sample Test Cases (Visible to Contestants)
- **Sample 1**:
  - **Input (stdin)**:
```text
anagram
nagaram
```
  - **Expected Output (stdout)**: `true`
  - **Explanation**: `Both strings contain 3 'a's, 1 'n', 1 'g', 1 'r', and 1 'm'.`
- **Sample 2**:
  - **Input (stdin)**:
```text
rat
car
```
  - **Expected Output (stdout)**: `false`
  - **Explanation**: `'r' and 'a' match, but 't' does not match 'c'.`
- **Sample 3**:
  - **Input (stdin)**:
```text
listen
silent
```
  - **Expected Output (stdout)**: `true`
  - **Explanation**: `Rearranging 'listen' forms 'silent'.`

#### Hidden Test Cases (System Verification Suite)
- **Hidden 1**:
  - Input:
```text
a
a
```
  - Expected: `true`
- **Hidden 2**:
  - Input:
```text
ab
a
```
  - Expected: `false`
- **Hidden 3**:
  - Input:
```text
aa
bb
```
  - Expected: `false`
- **Hidden 4**:
  - Input:
```text
aacc
cca
```
  - Expected: `false`
- **Hidden 5**:
  - Input:
```text
orchestra
carthorse
```
  - Expected: `true`

#### Starter Code Templates
- **C++**:
```cpp
#include <iostream>
#include <string>

int main() {
    std::string s, t;
    if (!(std::cin >> s >> t)) return 0;
    // Write your solution below
    return 0;
}
```

- **Python**:
```python
import sys

def solve():
    tokens = sys.stdin.read().split()
    if len(tokens) < 2:
        return
    s, t = tokens[0], tokens[1]
    # Write your solution below

if __name__ == '__main__':
    solve()
```

- **Java**:
```java
import java.util.Scanner;

public class Solution {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (!sc.hasNext()) return;
        String s = sc.next();
        String t = sc.next();
        // Write your solution below
    }
}
```

- **JavaScript**:
```javascript
const fs = require('fs');

function main() {
    const tokens = fs.readFileSync(0, 'utf-8').trim().split(/\s+/);
    if (tokens.length < 2) return;
    const [s, t] = tokens;
    // Write your solution below
}

main();
```

4. Click **"Publish Problem"**.
5. **Verification**:
   - The problem appears instantly in the catalog `/problems`.
   - Navigate to `/problems/valid-anagram` and verify that submitting the working solution below achieves an **Accepted** verdict:

```python
import sys

def solve():
    tokens = sys.stdin.read().split()
    if len(tokens) < 2:
        return
    s, t = tokens[0], tokens[1]
    if len(s) != len(t):
        print("false")
        return
    
    count = {}
    for c in s: count[c] = count.get(c, 0) + 1
    for c in t: count[c] = count.get(c, 0) - 1
    
    print("true" if all(v == 0 for v in count.values()) else "false")

if __name__ == '__main__':
    solve()
```

---

### Feature 2.2 — Edit an Existing Problem & Manage Test Cases

1. While logged in as `setter` (or `admin`), navigate to `/admin` and select the **"Problems"** tab.
2. In the search box, search `two-sum`.
3. Click the **"Edit"** action button (or navigate directly to `/admin/problems/two-sum/edit`).
4. **Sample Test Cases**:
   - Add additional sample test cases by clicking **"+ Add Test Case"**.
   - Fill in standard input (stdin), expected output (stdout), and optional explanations.
5. **Hidden Test Cases Suite**:
   - Expand the **"Hidden Evaluation Test Cases"** collapsible panel.
   - Click **"+ Add Hidden Case"**.
   - Input (stdin):
```text
6
10 20 30 40 50 60
110
```
   - Expected Output (stdout): `4 5`
6. Click **"Save & Update Problem"**.
7. **Verification**:
   - Success banner appears: *"Problem updated successfully! Redirecting..."*
   - Returns to `/problems/two-sum` and verifies that submissions evaluate against the full updated suite.

---

### Feature 2.3 — Delete a Problem

1. Log in as `admin` or `setter` (author of the problem).
2. **Method A — From Admin/Setter Problems Table**:
   - Navigate to `/admin` and switch to the **"Problems"** tab.
   - Find the problem to remove (e.g., `valid-anagram`).
   - Click the red **Trash icon (Delete)** button in the Actions column.
   - Confirm the browser prompt: *"Are you sure you want to permanently delete '...'? This cannot be undone."*
3. **Method B — From Edit Problem Page**:
   - Navigate to `/admin/problems/:id/edit`.
   - In the top action bar, click the **"Delete"** button with trash icon.
   - Confirm the deletion prompt.
4. **Verification**:
   - Problem is immediately purged from the database and disappears from `/problems` and `/admin` problem lists.

---

### Feature 2.4 — Create a Contest Round

1. Log in as `setter` or `admin`.
2. Navigate to `/contests/create` (or click **"New Contest"** on the admin contests tab).
3. Fill in the contest form:
   - **Title**: `Spring Sprint Challenge 2026`
   - **Slug**: `spring-sprint-2026`
   - **Description**: `Speed programming contest testing strings, dynamic programming, and binary search.`
   - **Start Time**: Set to 5 minutes from current system clock (e.g., if local time is `15:30`, set to `15:35`).
   - **End Time**: Set to 90 minutes after start time (`17:05`).
   - **Duration**: `90` minutes.
   - **Banner Badge**: `Rated • Division 2`
   - **Problems**: Select checkboxes for *Two Sum*, *Add Two Numbers*, and *Longest Substring Without Repeating Characters*.
4. Click **"Create Contest"**.
5. **Verification**:
   - Redirects to `/contests`.
   - The new contest appears under the **"Upcoming Contests"** section with a live countdown timer.

---

### Feature 2.4 — Publish an Editorial

1. Navigate to `/admin` and select the **"Contests"** tab.
2. Find the contest **Global CodeSprint 2026** and click **"Write Editorial"** (or expand the editorial section).
3. Switch between **Edit** and **Preview** modes and paste the following markdown:

```markdown
# Official Editorial — Global CodeSprint 2026

## Problem A: Two Sum
### Key Insight
Using a hash map allows $O(1)$ average time lookups for the complement `target - nums[i]`.
### Complexity
- **Time Complexity**: $\mathcal{O}(N)$ single pass.
- **Space Complexity**: $\mathcal{O}(N)$ to store visited values in hash table.

## Problem B: Add Two Numbers
### Key Insight
Simulate column-by-column elementary school addition maintaining a `carry` variable across node transitions.
```

4. Click **"Save Editorial"**.
5. **Verification**:
   - Green confirmation banner: *"Editorial saved successfully."*
   - Navigate to `/contests/global-codesprint-2026`, switch to the **"Editorial"** tab, and verify the formatted markdown renders correctly.

---

## 🛡️ Role 3: Admin (admin / Admin@123)

### Feature 3.1 — System Health Check

1. Log in with admin credentials: `admin` / `Admin@123`.
2. Navigate to `/admin` and click the **"Health"** tab.
3. **Health Dashboard Inspection**:

| Metric | What It Measures | Healthy State | Unhealthy Indicator |
|:---|:---|:---:|:---|
| **Redis Connection** | RESP3 socket connection between API Gateway and Redis 7 | `connected` (Green) | `disconnected` / `reconnecting` |
| **BullMQ Queue Depth** | Number of active and waiting code evaluation jobs in Redis | `0` to `< 10` | Continually growing without decreasing |
| **Failed Queue Jobs** | Number of unhandled evaluation container crashes | `0` | `> 0` (Indicates worker failure) |

4. Click **"Refresh Health Status"** to poll real-time metrics.

---

### Feature 3.2 — User Role Management

1. In `/admin`, click the **"Users"** tab.
2. In the search box, search `bhargava`.
3. Locate the table row for `bhargava` (`bhargava@codejudge.com`).
4. Click the **Role Dropdown** and change `User` to `Setter`.
5. **Verification**:
   - Backend sends `PATCH /api/admin/users/:id/role` with `{ role: 'setter' }`.
   - The badge updates to blue `Setter`.
   - Log out and log in as `bhargava` — the **"Author Problem"** button now appears in the navigation header.
6. Return to `/admin` as `admin` and demote `bhargava` back to `User`.

---

### Feature 3.3 — Platform Statistics

1. In `/admin`, view the **Overview** tab.
2. **Inspect Platform Counters**:
   - **Platform Users**: Total registered documents in `users` collection.
   - **Problems Published**: Count of problems where `isPublished: true`.
   - **Total Submissions**: Total records in `submissions` collection.
   - **Overall Acceptance Rate**: `(Accepted Submissions / Total Submissions) * 100`.
3. **Real-Time Increment Trigger**:
   - Submitting any new solution immediately increments **Total Submissions**; submitting an Accepted solution increments both **Total Submissions** and **Accepted Count**.

---

### Feature 3.4 — Run a Plagiarism Scan

> **Prerequisite**: Requires at least 2 Accepted submissions on the same problem within the same contest.

#### Step 1: Create the Test Scenario
1. Log in as `bhargava` (`User@123`).
2. Navigate to `/contests/global-codesprint-2026` and open Problem **A** (*Two Sum*).
3. Submit this Python solution:

```python
import sys

def solve():
    raw = sys.stdin.read().split()
    if not raw: return
    n = int(raw[0])
    arr = [int(x) for x in raw[1:n+1]]
    t = int(raw[n+1])
    d = {}
    for idx, val in enumerate(arr):
        comp = t - val
        if comp in d:
            print(f"{d[comp]} {idx}")
            return
        d[val] = idx

if __name__ == '__main__':
    solve()
```

4. Log out, then log in as `setter` (`Setter@123`).
5. Open Problem **A** in the same contest and submit a syntactically renamed clone:

```python
import sys

def solve():
    tokens = sys.stdin.read().split()
    if not tokens: return
    total_elements = int(tokens[0])
    numbers = [int(num) for num in tokens[1:total_elements+1]]
    target_sum = int(tokens[total_elements+1])
    lookup_table = {}
    for position, element in enumerate(numbers):
        remainder = target_sum - element
        if remainder in lookup_table:
            print(f"{lookup_table[remainder]} {position}")
            return
        lookup_table[element] = position

if __name__ == '__main__':
    solve()
```

#### Step 2: Trigger Plagiarism Analysis
6. Log in as `admin` (`Admin@123`) and navigate to `/admin` → **"Plagiarism"** tab.
7. Select **Global CodeSprint 2026** in the contest dropdown.
8. Set the **Similarity Threshold** slider to `70%`.
9. Click **"Run Forensic Scan"**.

#### Step 3: Verify Plagiarism Detection Results
- **Expected**:
  - The Plagiarism Service AST tokenizer and Winnowing fingerprint algorithm flags the pair `bhargava` ↔ `setter`.
  - The flagged match appears in the results table with **Similarity > 85%**.
  - Click on the pair to view side-by-side token-highlighted code comparison.

---

### Feature 3.5 — Delete a Problem

1. Navigate to `/admin` → **"Problems"** tab.
2. Locate or create a test problem (e.g., `test-to-delete`).
3. Click the red **"Delete"** trash icon on the problem row.
4. Confirm the prompt: *"Are you sure you want to permanently delete this problem?"*.
5. **Verification**:
   - Backend sends `DELETE /api/problems/:id`.
   - The problem disappears from the table and catalog.
   - Existing submissions referencing the deleted `problemId` remain preserved in MongoDB for user history audit trails.

---

## 🔴 Edge Case & Error State Testing

Verify system resilience and graceful error handling across edge scenarios:

| # | Edge Case Scenario | Reproduction Steps | Expected UI & System Response |
|:---:|:---|:---|:---|
| **E1** | **Docker Daemon Offline** | Stop Docker daemon or kill `judge-worker`, then submit code. | UI shows clear error: `"Judge service unavailable. Try again shortly."` HTTP 503 returned; no fake submission IDs created. |
| **E2** | **Backend Offline** | Stop `api-gateway` process and click "Run Code" in workspace. | Drawer displays: `"Cannot connect to judge service. Ensure backend is running."` |
| **E3** | **Invalid Problem Slug** | Navigate directly to `http://localhost:5173/problems/non-existent-slug`. | Automatic redirect to `/problems` with a red dismissible alert banner: `"Problem not found."` |
| **E4** | **Expired Session Token** | Open DevTools `Application` → `localStorage`, change `algoflow_token` to `garbage_value`, then click `/dashboard`. | Interceptor triggers `auth:expired` event, clears both storages, redirects to `/login` with amber banner: `"Your session has expired. Please log in again."` |
| **E5** | **Unauthorized Role Access** | Log in as `bhargava` (`user` role) and manually navigate to `http://localhost:5173/admin`. | `ProtectedRoute` denies access and redirects user to `/` home. |
| **E6** | **Submit Empty Code** | Clear the code editor completely and click "Submit". | Toast alert: `"Cannot submit empty code."` Submission request is blocked client-side. |
| **E7** | **Submit to Upcoming Contest** | Attempt submission on a contest whose `startTime` is in the future. | System blocks submission with error: `"Contest has not started yet."` |

---

## 📋 Complete Mock Data Reference

A consolidated reference containing copy-paste ready data for all testing scenarios.

### 1. Two Sum Reference Solutions

#### Working C++ Solution
```cpp
#include <iostream>
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
}
```

#### Broken C++ Solution (Wrong Answer)
```cpp
#include <iostream>

int main() {
    std::cout << "0 0" << std::endl;
    return 0;
}
```

---

### 2. Complete New Problem Definition (Valid Anagram)

```json
{
  "title": "Valid Anagram",
  "slug": "valid-anagram",
  "difficulty": "Easy",
  "timeLimitMs": 1000,
  "memoryLimitMb": 128,
  "tags": ["String", "Hash Table", "Sorting"],
  "constraints": [
    "1 <= s.length, t.length <= 5 * 10^4",
    "s and t consist of lowercase English letters."
  ],
  "description": "Given two strings `s` and `t`, return `true` if `t` is an **anagram** of `s`, and `false` otherwise.\n\nAn **anagram** is a word or phrase formed by rearranging the letters of a different word or phrase, typically using all the original letters exactly once.",
  "sampleTestCases": [
    {
      "input": "anagram\nnagaram",
      "expectedOutput": "true",
      "explanation": "Both strings contain 3 a's, 1 n, 1 g, 1 r, and 1 m."
    },
    {
      "input": "rat\ncar",
      "expectedOutput": "false",
      "explanation": "'r' and 'a' match, but 't' does not match 'c'."
    },
    {
      "input": "listen\nsilent",
      "expectedOutput": "true",
      "explanation": "Rearranging 'listen' forms 'silent'."
    }
  ],
  "hiddenTestCases": [
    { "input": "a\na", "expectedOutput": "true" },
    { "input": "ab\na", "expectedOutput": "false" },
    { "input": "aa\nbb", "expectedOutput": "false" },
    { "input": "aacc\ncca", "expectedOutput": "false" },
    { "input": "orchestra\ncarthorse", "expectedOutput": "true" }
  ],
  "starterCode": {
    "cpp": "#include <iostream>\n#include <string>\n\nint main() {\n    std::string s, t;\n    if (!(std::cin >> s >> t)) return 0;\n    return 0;\n}",
    "python": "import sys\n\ndef solve():\n    tokens = sys.stdin.read().split()\n    if len(tokens) < 2: return\n    s, t = tokens[0], tokens[1]\n\nif __name__ == '__main__':\n    solve()",
    "java": "import java.util.Scanner;\n\npublic class Solution {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (!sc.hasNext()) return;\n        String s = sc.next();\n        String t = sc.next();\n    }\n}",
    "javascript": "const fs = require('fs');\n\nfunction main() {\n    const tokens = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/);\n    if (tokens.length < 2) return;\n    const [s, t] = tokens;\n}\n\nmain();"
  }
}
```

---

### 3. Complete Contest Definition (Spring Sprint 2026)

```json
{
  "title": "Spring Sprint Challenge 2026",
  "slug": "spring-sprint-2026",
  "description": "Speed programming contest testing strings, dynamic programming, and binary search.",
  "durationMinutes": 90,
  "bannerBadge": "Rated • Division 2",
  "scoringMode": "ICPC",
  "status": "upcoming"
}
```

---

### 4. Contest Editorial Template

```markdown
# Official Editorial — Global CodeSprint 2026

## Problem A: Two Sum (Easy)
### Intuition
Store elements in a hash map mapping value $\to$ index. For each element $x$, query if $target - x$ exists in the table.

### Complexity Analysis
- **Time Complexity**: $\mathcal{O}(N)$ amortized.
- **Space Complexity**: $\mathcal{O}(N)$ auxiliary hash map storage.

```cpp
#include <iostream>
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
        int comp = target - nums[i];
        if (seen.count(comp)) {
            std::cout << seen[comp] << " " << i << "\n";
            return 0;
        }
        seen[nums[i]] = i;
    }
    return 0;
}
```
```

---

### 5. Plagiarism Test Case Setup (Pair Clones)

#### Participant 1 Code (`bhargava`)
```python
import sys

def solve():
    raw = sys.stdin.read().split()
    if not raw: return
    n = int(raw[0])
    arr = [int(x) for x in raw[1:n+1]]
    t = int(raw[n+1])
    d = {}
    for idx, val in enumerate(arr):
        comp = t - val
        if comp in d:
            print(f"{d[comp]} {idx}")
            return
        d[val] = idx

if __name__ == '__main__':
    solve()
```

#### Participant 2 Code (`setter`)
```python
import sys

def solve():
    tokens = sys.stdin.read().split()
    if not tokens: return
    total_elements = int(tokens[0])
    numbers = [int(num) for num in tokens[1:total_elements+1]]
    target_sum = int(tokens[total_elements+1])
    lookup_table = {}
    for position, element in enumerate(numbers):
        remainder = target_sum - element
        if remainder in lookup_table:
            print(f"{lookup_table[remainder]} {position}")
            return
        lookup_table[element] = position

if __name__ == '__main__':
    solve()
```
