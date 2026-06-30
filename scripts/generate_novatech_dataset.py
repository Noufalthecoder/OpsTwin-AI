import os
import json
import random
from datetime import datetime, timedelta

BASE_DIR = os.path.join(os.getcwd(), "datasets", "NovaTech")
FOLDERS = ["Emails", "Slack", "Meetings", "Jira", "GitHub", "SOPs"]
GITHUB_FOLDERS = ["NovaTech-Frontend", "NovaTech-Backend"]

# Ensure directories exist
for folder in FOLDERS:
    os.makedirs(os.path.join(BASE_DIR, folder), exist_ok=True)
for gf in GITHUB_FOLDERS:
    os.makedirs(os.path.join(BASE_DIR, "GitHub", gf), exist_ok=True)

# ----------------- PERSONAS -----------------
EMPLOYEES = {
    "alice_hr": {"name": "Alice Johnson", "role": "HR Manager", "email": "alice.j@novatech.com"},
    "bob_it": {"name": "Bob Smith", "role": "IT Support Lead", "email": "bob.s@novatech.com"},
    "charlie_eng": {"name": "Charlie Davis", "role": "Engineering Manager", "email": "charlie.d@novatech.com"},
    "david_dev": {"name": "David Wilson", "role": "Senior Developer", "email": "david.w@novatech.com"},
    "eve_sec": {"name": "Eve Carter", "role": "Security Analyst", "email": "eve.c@novatech.com"},
    "frank_fin": {"name": "Frank Miller", "role": "Finance Director", "email": "frank.m@novatech.com"},
    "grace_ops": {"name": "Grace Lee", "role": "Operations Manager", "email": "grace.l@novatech.com"},
    "henry_sales": {"name": "Henry Ford", "role": "Sales Lead", "email": "henry.f@novatech.com"},
    "ivy_new": {"name": "Ivy Chen", "role": "New Hire - Dev", "email": "ivy.c@novatech.com"},
}

# ----------------- SCENARIOS (For Cross-Referencing) -----------------
SCENARIOS = [
    {
        "id": "SCENARIO_1",
        "jira_id": "NOV-1042",
        "topic": "Onboarding Delay for Ivy Chen",
        "description": "Ivy's laptop is delayed, and she can't access GitHub.",
        "people": ["alice_hr", "bob_it", "charlie_eng", "ivy_new"],
        "keywords": ["onboarding", "laptop", "access", "delayed"]
    },
    {
        "id": "SCENARIO_2",
        "jira_id": "NOV-1045",
        "topic": "Security Vulnerability in Auth Module",
        "description": "A critical CVE found in the authentication module.",
        "people": ["eve_sec", "david_dev", "charlie_eng"],
        "keywords": ["security", "CVE", "auth", "patch"]
    },
    {
        "id": "SCENARIO_3",
        "jira_id": "NOV-1050",
        "topic": "Q3 Cloud Budget Overrun",
        "description": "AWS costs spiked unexpectedly due to rogue instances.",
        "people": ["frank_fin", "grace_ops", "charlie_eng"],
        "keywords": ["budget", "AWS", "cost", "overrun"]
    },
    {
        "id": "SCENARIO_4",
        "jira_id": "NOV-1088",
        "topic": "Database Outage during Peak Hours",
        "description": "Primary database went down, causing downtime for clients.",
        "people": ["grace_ops", "david_dev", "henry_sales"],
        "keywords": ["outage", "database", "downtime", "escalation"]
    },
    {
        "id": "SCENARIO_5",
        "jira_id": "NOV-1102",
        "topic": "Frontend Performance Degradation",
        "description": "New release caused a 30% drop in page load speed.",
        "people": ["david_dev", "charlie_eng"],
        "keywords": ["performance", "frontend", "lag", "speed"]
    }
]

# Random Helpers
def random_date(start_days_ago=30):
    now = datetime.now()
    delta = timedelta(days=random.randint(0, start_days_ago), hours=random.randint(0, 23), minutes=random.randint(0, 59))
    return (now - delta).strftime("%Y-%m-%dT%H:%M:%SZ")

def random_person():
    return random.choice(list(EMPLOYEES.values()))

def random_id(prefix, length=4):
    return f"{prefix}-{''.join(random.choices('0123456789', k=length))}"

# ----------------- 1. SOPS -----------------
SOPS = [
    {"title": "Employee Onboarding", "purpose": "Standardize the onboarding process for new hires.", "steps": ["1. HR triggers request", "2. IT provisions laptop", "3. Access granted to systems"]},
    {"title": "Leave Approval", "purpose": "Process for requesting and approving PTO.", "steps": ["1. Employee submits via portal", "2. Manager reviews", "3. HR logs in system"]},
    {"title": "Incident Response", "purpose": "Protocol for P1/P2 outages.", "steps": ["1. Alert received", "2. War room created", "3. Mitigation deployed", "4. Post-mortem written"]},
    {"title": "Password Reset", "purpose": "Securely resetting passwords.", "steps": ["1. User contacts IT", "2. Identity verified", "3. Temp password issued"]},
    {"title": "Access Management", "purpose": "Granting/Revoking system access.", "steps": ["1. Ticket created", "2. Security approves", "3. IT applies policy"]},
    {"title": "Procurement", "purpose": "Buying new hardware/software.", "steps": ["1. Quote received", "2. Finance approves", "3. PO issued"]},
    {"title": "Vendor Approval", "purpose": "Vetting new third-party vendors.", "steps": ["1. Security audit", "2. Legal review", "3. Contract signed"]},
    {"title": "Travel Reimbursement", "purpose": "Filing travel expenses.", "steps": ["1. Receipts uploaded", "2. Manager approves", "3. Finance pays out"]},
    {"title": "Expense Claims", "purpose": "General expense reimbursements.", "steps": ["1. Form submitted", "2. Receipts verified", "3. Payment processed"]},
    {"title": "Security Audit", "purpose": "Quarterly internal audit process.", "steps": ["1. Logs pulled", "2. Vulnerability scan", "3. Report generated"]}
]

def generate_sops():
    for i, sop in enumerate(SOPS):
        content = f"# SOP: {sop['title']}\n\n"
        content += f"## Purpose\n{sop['purpose']}\n\n"
        content += "## Scope\nApplies to all NovaTech employees.\n\n"
        content += "## Responsibilities\nHR, IT, and respective Department Heads.\n\n"
        content += "## Step-by-Step Workflow\n"
        for step in sop['steps']:
            content += f"- {step}\n"
        content += "\n## Approvals\nRequires minimum 1 manager approval.\n"
        
        # Inject scenario cross-reference to make it realistic
        if sop['title'] == "Employee Onboarding":
            content += f"\n*Note: Ensure timely execution to avoid delays as seen in {SCENARIOS[0]['jira_id']}*\n"
        if sop['title'] == "Incident Response":
            content += f"\n*Note: Reference recent outages e.g., {SCENARIOS[3]['jira_id']}*\n"
            
        with open(os.path.join(BASE_DIR, "SOPs", f"SOP_{(i+1):02d}_{sop['title'].replace(' ', '_')}.md"), "w") as f:
            f.write(content)

# ----------------- 2. JIRA -----------------
def generate_jiras():
    issue_types = ["Bug", "Task", "Epic", "Story", "Improvement"]
    statuses = ["To Do", "In Progress", "In Review", "Done"]
    priorities = ["Low", "Medium", "High", "Critical"]
    
    count = 0
    # First, generate scenario specific Jiras
    for scen in SCENARIOS:
        count += 1
        assignee = EMPLOYEES[scen['people'][0]]
        reporter = EMPLOYEES[scen['people'][1]] if len(scen['people']) > 1 else random_person()
        
        jira = {
            "issue_id": scen['jira_id'],
            "title": scen['topic'],
            "type": "Bug" if "outage" in scen['keywords'] else "Task",
            "priority": "Critical" if "outage" in scen['keywords'] or "security" in scen['keywords'] else "Medium",
            "status": random.choice(statuses),
            "assignee": assignee['name'],
            "reporter": reporter['name'],
            "description": scen['description'],
            "story_points": random.choice([1, 2, 3, 5, 8]),
            "labels": scen['keywords'],
            "created_at": random_date(),
            "comments": [
                {"author": reporter['name'], "body": f"We need to get this sorted ASAP. Let's discuss in the sync."},
                {"author": assignee['name'], "body": f"Looking into this now. Will update Slack."}
            ]
        }
        with open(os.path.join(BASE_DIR, "Jira", f"{jira['issue_id']}.json"), "w") as f:
            json.dump(jira, f, indent=2)

    # Fill the rest up to 50
    while count < 50:
        count += 1
        assignee = random_person()
        reporter = random_person()
        issue_id = f"NOV-{1100 + count}"
        jira = {
            "issue_id": issue_id,
            "title": f"Update {random.choice(['API', 'UI', 'Database', 'Docs', 'Config'])} for {random.choice(['Q3', 'Client A', 'Security', 'Performance'])}",
            "type": random.choice(issue_types),
            "priority": random.choice(priorities),
            "status": random.choice(statuses),
            "assignee": assignee['name'],
            "reporter": reporter['name'],
            "description": "Routine task execution based on latest sprint planning.",
            "story_points": random.choice([1, 2, 3, 5, 8, 13]),
            "labels": ["routine", "sprint"],
            "created_at": random_date(),
            "comments": []
        }
        with open(os.path.join(BASE_DIR, "Jira", f"{jira['issue_id']}.json"), "w") as f:
            json.dump(jira, f, indent=2)

# ----------------- 3. SLACK -----------------
def generate_slack():
    channels = ["#hr", "#engineering", "#operations", "#security", "#finance"]
    count = 0
    
    # Scenario Specific
    for scen in SCENARIOS:
        count += 1
        chan = random.choice(channels)
        if "finance" in scen['keywords'] or "budget" in scen['keywords']: chan = "#finance"
        if "security" in scen['keywords']: chan = "#security"
        
        thread = {
            "channel": chan,
            "thread_id": f"thread_{count}",
            "messages": [
                {"user": EMPLOYEES[scen['people'][0]]['name'], "timestamp": random_date(), "text": f"Hey all, regarding {scen['topic']} ({scen['jira_id']}), any updates?"},
            ]
        }
        if len(scen['people']) > 1:
            thread['messages'].append({"user": EMPLOYEES[scen['people'][1]]['name'], "timestamp": random_date(), "text": f"I'm working on {scen['jira_id']} now. The {scen['keywords'][0]} is proving tricky."})
        
        with open(os.path.join(BASE_DIR, "Slack", f"{thread['thread_id']}.json"), "w") as f:
            json.dump(thread, f, indent=2)
            
    # Generic up to 40
    while count < 40:
        count += 1
        p1 = random_person()
        p2 = random_person()
        chan = random.choice(channels)
        thread = {
            "channel": chan,
            "thread_id": f"thread_{count}",
            "messages": [
                {"user": p1['name'], "timestamp": random_date(), "text": f"Can someone review my PR? It's related to NOV-{random.randint(1100, 1150)}."},
                {"user": p2['name'], "timestamp": random_date(), "text": f"Sure, I'll take a look in 10 mins."}
            ]
        }
        with open(os.path.join(BASE_DIR, "Slack", f"{thread['thread_id']}.json"), "w") as f:
            json.dump(thread, f, indent=2)


# ----------------- 4. EMAILS -----------------
def generate_emails():
    topics = ["Leave approvals", "Employee onboarding", "Purchase approvals", "IT support", "Security incidents", "Client escalations", "Finance approvals", "HR discussions"]
    count = 0
    
    # Scenario Emails
    for scen in SCENARIOS:
        count += 1
        sender = EMPLOYEES[scen['people'][0]]
        receiver = EMPLOYEES[scen['people'][-1]]
        email = f"""From: {sender['name']} <{sender['email']}>
To: {receiver['name']} <{receiver['email']}>
Date: {random_date()}
Subject: URGENT: {scen['topic']} - {scen['jira_id']}

Hi {receiver['name'].split()[0]},

We are facing issues with {scen['topic']}. 
I've tracked this in Jira under {scen['jira_id']}. 
We also discussed this in Slack recently. Please review the SOPs if needed.

Thanks,
{sender['name']}
"""
        with open(os.path.join(BASE_DIR, "Emails", f"email_{count}.txt"), "w") as f:
            f.write(email)
            
    # Generic up to 60
    while count < 60:
        count += 1
        sender = random_person()
        receiver = random_person()
        topic = random.choice(topics)
        email = f"""From: {sender['name']} <{sender['email']}>
To: {receiver['name']} <{receiver['email']}>
Date: {random_date()}
Subject: Regarding {topic}

Hi {receiver['name'].split()[0]},

Just reaching out regarding the recent {topic}. 
Can you please provide an update by EOD?

Thanks,
{sender['name']}
"""
        with open(os.path.join(BASE_DIR, "Emails", f"email_{count}.txt"), "w") as f:
            f.write(email)

# ----------------- 5. MEETINGS -----------------
def generate_meetings():
    count = 0
    # Scenario Meetings
    for scen in SCENARIOS:
        count += 1
        meeting = f"""# Meeting: {scen['topic']} Sync
Date: {random_date()}
Attendees: {', '.join([EMPLOYEES[p]['name'] for p in scen['people']])}

## Agenda
1. Review {scen['jira_id']}
2. Discuss mitigation for {scen['keywords'][0]}

## Discussion
- The team noted that {scen['topic']} has caused delays.
- We need to refer to our SOPs to avoid this.

## Action Items
- [ ] Resolve {scen['jira_id']} (Assignee: {EMPLOYEES[scen['people'][0]]['name']})
"""
        with open(os.path.join(BASE_DIR, "Meetings", f"meeting_{count}.md"), "w") as f:
            f.write(meeting)
            
    # Generic up to 30
    while count < 30:
        count += 1
        meeting = f"""# Meeting: Weekly Sync - {random.choice(['Engineering', 'HR', 'Ops', 'Finance'])}
Date: {random_date()}
Attendees: {random_person()['name']}, {random_person()['name']}, {random_person()['name']}

## Agenda
1. Weekly Status
2. Blockers

## Discussion
- Reviewed ongoing Jira tickets.
- Discussed process improvements.

## Action Items
- [ ] Update documentation.
"""
        with open(os.path.join(BASE_DIR, "Meetings", f"meeting_{count}.md"), "w") as f:
            f.write(meeting)


# ----------------- 6. GITHUB -----------------
def generate_github():
    for repo in GITHUB_FOLDERS:
        # README
        with open(os.path.join(BASE_DIR, "GitHub", repo, "README.md"), "w") as f:
            f.write(f"# {repo}\n\nCore repository for NovaTech Solutions. Refer to SOPs for deployment guidelines.\n")
            
        # Release Notes
        with open(os.path.join(BASE_DIR, "GitHub", repo, "ReleaseNotes_v1.2.md"), "w") as f:
            f.write(f"# Release v1.2\n\nIncludes fixes for:\n- {SCENARIOS[1]['jira_id']}\n- {SCENARIOS[4]['jira_id']}\n")

        # Commits (10 per repo)
        for i in range(10):
            commit = {
                "sha": random_id("sha", 8),
                "author": random_person()['name'],
                "date": random_date(),
                "message": f"Fix issue {random.choice([s['jira_id'] for s in SCENARIOS])} - applied patch."
            }
            with open(os.path.join(BASE_DIR, "GitHub", repo, f"commit_{commit['sha']}.json"), "w") as f:
                json.dump(commit, f, indent=2)
                
        # PRs (5 per repo)
        for i in range(5):
            pr = {
                "pr_id": random.randint(100, 999),
                "title": f"Feature integration for {random.choice(['Auth', 'Billing', 'UI', 'DB'])}",
                "author": random_person()['name'],
                "status": random.choice(["Open", "Merged", "Closed"]),
                "linked_issue": random.choice([s['jira_id'] for s in SCENARIOS])
            }
            with open(os.path.join(BASE_DIR, "GitHub", repo, f"PR_{pr['pr_id']}.json"), "w") as f:
                json.dump(pr, f, indent=2)

        # Issues (5 per repo)
        for i in range(5):
            issue = {
                "gh_issue_id": random.randint(1000, 1999),
                "title": f"Bug reported by QA",
                "author": random_person()['name'],
                "status": random.choice(["Open", "Closed"]),
                "body": f"Please see related Jira ticket: NOV-{random.randint(1100, 1150)}."
            }
            with open(os.path.join(BASE_DIR, "GitHub", repo, f"Issue_{issue['gh_issue_id']}.json"), "w") as f:
                json.dump(issue, f, indent=2)


if __name__ == "__main__":
    generate_sops()
    generate_jiras()
    generate_slack()
    generate_emails()
    generate_meetings()
    generate_github()
    print("NovaTech Enterprise Dataset successfully generated!")
