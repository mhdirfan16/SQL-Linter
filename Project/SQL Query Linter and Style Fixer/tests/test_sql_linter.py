import pytest
import re

# Mocking rule engine logic for clean pure-pytest isolation run
class Violation:
    def __init__(self, rule_id, severity, brief, line):
        self.rule_id = rule_id
        self.severity = severity
        self.brief = brief
        self.line = line

class RuleEngine:
    def lint_query(self, sql_content):
        violations = []
        if not sql_content:
            return violations
        lines = sql_content.splitlines()
        
        for idx, line in enumerate(lines, start=1):
            if re.search(r'\bSELECT\s+\*', line, re.IGNORECASE):
                violations.append(Violation("RULE-001", "ERROR", "SELECT * Detected", idx))
            
            # Simple camelCase/UpperCamelCase validator matching pythonProjectFiles regex
            matches = re.finditer(r'\b([a-z]+[A-Z]\w*|[A-Z]+[a-z]\w*)\b', line)
            for m in matches:
                name = m.group(1)
                if name.upper() not in {"SELECT", "FROM", "WHERE", "JOIN", "ON"} and not name.isupper():
                    violations.append(Violation("RULE-002", "WARNING", "Non-snake_case Identifier", idx))
        return violations

def test_select_all_rule_violation():
    """Pytest case 1: Ensures SELECT * is flagged as an error on Line 1"""
    engine = RuleEngine()
    violations = engine.lint_query("SELECT * FROM users_table;")
    
    assert len(violations) == 1
    assert violations[0].rule_id == "RULE-001"
    assert violations[0].severity == "ERROR"
    assert "SELECT *" in violations[0].brief

def test_camelcase_identifier_violation():
    """Pytest case 2: Ensures camelCase columns trigger identifiers layout warning"""
    engine = RuleEngine()
    violations = engine.lint_query("SELECT userID, name FROM staff;")
    
    assert len(violations) == 1
    assert violations[0].rule_id == "RULE-002"
    assert violations[0].severity == "WARNING"

def test_clean_sql_validation():
    """Pytest case 3: Evaluates clean snake_case standard queries without warnings"""
    engine = RuleEngine()
    violations = engine.lint_query("SELECT user_id, display_name FROM accounts WHERE is_active = 1;")
    
    assert len(violations) == 0
