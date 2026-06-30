import re
from typing import List, Dict, Any

def discover_workflow(text: str, document_type: str) -> dict:
    """
    Advanced Rule-based heuristic engine to discover workflow from document text.
    Analyses the document text to extract:
    - workflow_name
    - start (start event)
    - end (end event)
    - steps (sequential steps)
    - actors (aggregated)
    - departments (aggregated)
    - inputs (aggregated)
    - outputs (aggregated)
    - decision_points
    - approvals
    - dependencies
    - insights (complexity, execution time, etc.)
    """
    text_lower = text.lower()
    lines = [line.strip() for line in text.split("\n") if line.strip()]
    
    # 1. Determine Workflow Name
    workflow_name = "Generic Business Process"
    name_found = False
    for line in lines[:5]:
        # Look for headers like "SOP for X", "Workflow: X", "Process: X", "Title: X"
        match = re.match(r'^(sop\s+for|workflow|process|title|procedure)\s*:\s*(.+)$', line, re.IGNORECASE)
        if match:
            workflow_name = match.group(2).strip()
            name_found = True
            break
        elif line.isupper() and len(line.split()) < 8:
            workflow_name = line
            name_found = True
            break
            
    if not name_found:
        if document_type == "SOP":
            workflow_name = "Standard Operating Procedure Workflow"
        elif "customer" in text_lower or "complaint" in text_lower or "support" in text_lower:
            workflow_name = "Customer Support Process"
        elif "jira" in text_lower or "ticket" in text_lower:
            workflow_name = "Jira Ticket Lifecycle"
        elif "release" in text_lower or "deploy" in text_lower:
            workflow_name = "Deployment and Release Process"
        elif "leave" in text_lower or "hr" in text_lower or "policy" in text_lower:
            workflow_name = "HR Leave Request Process"

    # Define vocabulary for actors, departments, inputs, outputs
    known_actors = ["Customer", "Support", "Support Lead", "Engineer", "Engineering Manager", 
                    "QA", "QA Engineer", "Operator", "Technician", "Admin", "HR", "Sales", "Manager", "Employee", "System", "API"]
    known_departments = ["Customer Success", "Engineering", "QA", "Quality Assurance", "Operations", "HR", "Human Resources", "Sales", "Marketing", "IT", "Management"]
    
    input_keywords = ["complaint", "request", "ticket", "log", "code", "document", "email", "form", "data", "report", "requirements", "payload"]
    output_keywords = ["fix", "code", "notification", "report", "ticket", "approval", "email", "database", "dashboard", "release"]

    # 2. Extract Steps
    extracted_steps = []
    
    # First attempt: Try to parse lines starting with numbers/bullets
    step_id = 1
    for line in lines:
        # Match "1.", "Step 1:", "1)", "[1]"
        match_num = re.match(r'^(?:step\s*)?\[?(\d+)\]?[\.:\)]?\s+(.+)$', line, re.IGNORECASE)
        match_bullet = re.match(r'^(?:-|\*|•)\s+(.+)$', line)
        
        step_text = ""
        if match_num:
            step_text = match_num.group(2).strip()
        elif match_bullet:
            step_text = match_bullet.group(1).strip()
            
        if step_text and len(step_text.split()) > 2:
            extracted_steps.append((step_id, step_text))
            step_id += 1
            
    # Second attempt: If no list items, split text into sentences and find action sentences
    if not extracted_steps:
        # simple sentence splitter
        sentences = re.split(r'(?<=[.!?])\s+', text)
        for sentence in sentences:
            sentence = sentence.strip()
            # Must contain a verb-like action word
            if len(sentence.split()) > 4 and any(verb in sentence.lower() for verb in ["receive", "assign", "fix", "test", "approve", "deploy", "review", "notify", "log", "create", "send", "verify"]):
                extracted_steps.append((step_id, sentence))
                step_id += 1
                if step_id > 10: # Limit count for readability
                    break
                    
    # Fallback to default flow if still nothing extracted
    if not extracted_steps:
        extracted_steps = [
            (1, "Receive initial inquiry or request"),
            (2, "Review request details and assign team"),
            (3, "Execute core tasks and fix issues"),
            (4, "Perform quality checks and validation"),
            (5, "Obtain manager approval for changes"),
            (6, "Deploy updates and close ticket")
        ]

    # 3. Process Steps & Classify properties
    steps = []
    for sid, text_content in extracted_steps:
        lower_t = text_content.lower()
        
        # Determine step type
        stype = "Task"
        if sid == 1:
            stype = "Start"
        elif sid == len(extracted_steps):
            stype = "End"
        elif any(kw in lower_t for kw in ["approve", "approval", "sign-off", "authorized"]):
            stype = "Approval"
        elif any(kw in lower_t for kw in ["verify", "check", "if ", "whether", "test", "evaluate", "qa", "confirm", "review"]):
            stype = "Decision"
            
        # Extract Actor
        actor = "System" if any(kw in lower_t for kw in ["system", "api", "automated", "automatic"]) else None
        if not actor:
            for act in known_actors:
                if act.lower() in lower_t:
                    actor = act
                    break
        if not actor:
            # Contextual fallback based on step order
            if sid == 1:
                actor = "Customer" if "customer" in text_lower else "Employee"
            elif stype == "Approval":
                actor = "Manager"
            elif stype == "Decision":
                actor = "QA"
            else:
                actor = "Operator"

        # Extract Department
        dept = None
        for d in known_departments:
            if d.lower() in lower_t:
                dept = d
                break
        if not dept:
            # Contextual fallback based on actor
            if actor in ["Customer", "Employee"]:
                dept = "Operations"
            elif actor in ["Engineer", "QA", "QA Engineer", "System", "API"]:
                dept = "Engineering"
            elif actor in ["Support", "Support Lead"]:
                dept = "Customer Success"
            elif actor in ["Manager", "Engineering Manager"]:
                dept = "Management"
            else:
                dept = "Operations"

        # Extract Inputs and Outputs
        inputs = []
        outputs = []
        for kw in input_keywords:
            if kw in lower_t:
                inputs.append(kw)
        for kw in output_keywords:
            if kw in lower_t:
                outputs.append(kw)
                
        # Fill default inputs/outputs if empty
        if not inputs:
            inputs = ["task request" if sid > 1 else "trigger event"]
        if not outputs:
            outputs = ["task completion" if sid < len(extracted_steps) else "final delivery"]

        # Dependencies (sequential default)
        dependencies = [sid - 1] if sid > 1 else []

        # Make title clean and short
        title = text_content
        # Remove starting numbers/bullets if any
        title = re.sub(r'^(?:step\s*\d+\s*:?|\d+[\.:\)]?)\s*', '', title, flags=re.IGNORECASE)
        # Cap title length
        words = title.split()
        if len(words) > 5:
            title = " ".join(words[:5]) + "..."
            
        steps.append({
            "id": sid,
            "title": title,
            "actor": actor,
            "department": dept,
            "type": stype,
            "inputs": inputs,
            "outputs": outputs,
            "dependencies": dependencies
        })

    # 4. Aggregations
    actors = list(set([s["actor"] for s in steps if s["actor"]]))
    departments = list(set([s["department"] for s in steps if s["department"]]))
    
    all_inputs = []
    all_outputs = []
    for s in steps:
        all_inputs.extend(s["inputs"])
        all_outputs.extend(s["outputs"])
    inputs_agg = list(set(all_inputs))
    outputs_agg = list(set(all_outputs))
    
    decision_points = [s["title"] for s in steps if s["type"] == "Decision"]
    approvals = [s["title"] for s in steps if s["type"] == "Approval"]
    
    dependencies_agg = []
    for s in steps:
        for dep_id in s["dependencies"]:
            dep_step = next((x for x in steps if x["id"] == dep_id), None)
            if dep_step:
                dependencies_agg.append(f"{dep_step['title']} -> {s['title']}")

    # 5. Insights Calculation
    step_count = len(steps)
    approval_count = len(approvals)
    decision_count = len(decision_points)
    
    if step_count <= 4:
        complexity = "Low"
        estimated_time = "2 Hours"
    elif step_count <= 7:
        complexity = "Medium"
        estimated_time = "1 Day"
    else:
        complexity = "High"
        estimated_time = "5 Days"
        
    manual_steps_count = sum(1 for s in steps if s["actor"] not in ["System", "API"])
    automation_score = int(((step_count - manual_steps_count) / step_count) * 100) if step_count > 0 else 0

    # Ensure Start and End labels
    start_label = steps[0]["title"] if steps else "Start"
    end_label = steps[-1]["title"] if steps else "End"

    return {
        "workflow_name": workflow_name,
        "start": start_label,
        "end": end_label,
        "steps": steps,
        "actors": actors,
        "departments": departments,
        "inputs": inputs_agg,
        "outputs": outputs_agg,
        "decision_points": decision_points,
        "approvals": approvals,
        "dependencies": dependencies_agg,
        "insights": {
            "complexity": complexity,
            "estimated_execution_time": estimated_time,
            "automation_score": automation_score,
            "manual_steps": manual_steps_count,
            "approval_count": approval_count
        }
    }
