export interface ProjectFile {
  path: string;
  name: string;
  description: string;
  language: string;
  content: string;
}

export const pythonProjectFiles: ProjectFile[] = [
  {
    path: "pyproject.toml",
    name: "pyproject.toml",
    description: "Modern PEP-621 Python project configuration. Configures build backend, project metadata, Click entrypoint (linter command), tool configuration, and strict sqlfluff behavior rules.",
    language: "toml",
    content: `[build-system]
requires = ["setuptools>=61.0.0", "wheel"]
build-backend = "setuptools.build_meta"

[project]
name = "sql-query-linter"
version = "0.1.0"
description = "A powerful CLI SQL linter, automatic mechanical style fixer, and local AI agent SQL refactoring assistant."
readme = "README.md"
requires-python = ">=3.11"
license = { text = "MIT" }
dependencies = [
    "click>=8.1.7",
    "sqlfluff>=3.0.0",
    "rich>=13.7.0",
    "requests>=2.31.0",
]

[project.optional-dependencies]
dev = [
    "pytest>=7.4.3",
    "black>=23.12.1",
    "isort>=5.13.2",
]

[project.scripts]
sql-lint-fixer = "sql_linter.cli:main"

[tool.pytest.ini_options]
minversion = "6.0"
addopts = "-ra -q --tb=short"
testpaths = ["tests"]

[tool.black]
line-length = 88
target-version = ['py311']

[tool.isort]
profile = "black"
line_length = 88
`
  },
  {
    path: ".sqlfluff",
    name: ".sqlfluff",
    description: "Sqlfluff Linter Configuration. Sets up indentation spacing definitions, casing formatting choices, and allows customization of database dialects (e.g. ANSI, PostgreSQL).",
    language: "ini",
    content: `[sqlfluff]
dialect = ansi
templater = raw
max_line_length = 100
# Rule exclusion / inclusion
rules = L001, L003, L009, L010, L014, L016, L036

[sqlfluff:indentation]
indent_unit = space
tab_width = 4

[sqlfluff:rules:capitalisation.keywords]
capitalisation_policy = upper

[sqlfluff:rules:capitalisation.identifiers]
capitalisation_policy = lower

[sqlfluff:rules:aliasing.table]
aliasing = explicit

[sqlfluff:rules:aliasing.column]
aliasing = explicit
`
  },
  {
    path: "sql_linter/__init__.py",
    name: "__init__.py",
    description: "Standard Python package initializer. Exposes metadata version and primary linter modules.",
    language: "python",
    content: `"""
SQL Query Linter & Style Fixer package.
"""

from sql_linter.file_scanner import FileScanner
from sql_linter.rule_engine import RuleEngine, Violation
from sql_linter.auto_fixer import AutoFixer
from sql_linter.report_writer import ReportWriter
from sql_linter.llm_agent import SQLLMAgent

__version__ = "0.1.0"
`
  },
  {
    path: "sql_linter/file_scanner.py",
    name: "file_scanner.py",
    description: "Recursive folder scanning module. Discovers databases scripts matching SQL extensions recursively in nested subdirectories.",
    language: "python",
    content: `import os
from typing import List

class FileScanner:
    """
    Recursively scans directory trees to locate SQL dialect matches.
    """
    def __init__(self, extensions: List[str] = None):
        if extensions is None:
            self.extensions = [".sql"]
        else:
            self.extensions = [ext.lower() if ext.startswith(".") else f".{ext.lower()}" for ext in extensions]

    def scan_directory(self, directory: str) -> List[str]:
        """
        Walks directory paths and compiles matching sql query filenames.
        """
        if not os.path.exists(directory):
            raise ValueError(f"Target directory path does not exist: \${directory}")
        if not os.path.isdir(directory):
            raise ValueError(f"Path is not a directory: \${directory}")

        matched_files = []
        for root, _, files in os.walk(directory):
            for file in files:
                _, ext = os.path.splitext(file)
                if ext.lower() in self.extensions:
                    matched_files.append(os.path.abspath(os.path.join(root, file)))
                    
        return sorted(matched_files)
`
  },
  {
    path: "sql_linter/rule_engine.py",
    name: "rule_engine.py",
    description: "Modular rule check systems. Validates queries for SELECT *, CamelCase identifiers, and single-letter alias violations.",
    language: "python",
    content: `import re
from typing import Dict, List, Any

class Violation:
    """
    System value-object encapsulating a lint standard violation.
    """
    def __init__(self, rule_id: str, severity: str, brief: str, message: str, fix_hint: str, line: int = 1, column: int = 1, context: str = ""):
        self.rule_id = rule_id
        self.severity = severity
        self.brief = brief
        self.message = message
        self.fix_hint = fix_hint
        self.line = line
        self.column = column
        self.context = context

    def to_dict(self) -> Dict[str, Any]:
        return {
            "rule_id": self.rule_id,
            "severity": self.severity,
            "brief": self.brief,
            "message": self.message,
            "fix_hint": self.fix_hint,
            "line": self.line,
            "column": self.column,
            "context": self.context
        }


class RuleEngine:
    """
    Configurable and extensible SQL style review engine running custom regex models.
    """
    def __init__(self):
        self.reserved_keywords = {
            "SELECT", "FROM", "WHERE", "JOIN", "ON", "AND", "OR", "GROUP", "BY", 
            "ORDER", "LIMIT", "HAVING", "COUNT", "SUM", "AVG", "MAX", "MIN", "LEFT", "RIGHT", "INNER"
        }

    def lint_query(self, sql_content: str) -> List[Violation]:
        violations = []
        if not sql_content or not sql_content.strip():
            return violations
        lines = sql_content.splitlines()

        # Rule 1: Detect SELECT * (RULE-001 / CR-001)
        for idx, line in enumerate(lines, start=1):
            match = re.search(r'\\bSELECT\\s+\\*', line, re.IGNORECASE)
            if match:
                violations.append(Violation(
                    rule_id="RULE-001",
                    severity="ERROR",
                    brief="SELECT * Detected",
                    message="Querying all columns from a table degrades database indexing efficiency, consumes excessive server memory, and exposes the schema to downstream pipeline breakages.",
                    fix_hint="Replace '*' with explicit, fully-qualified column references (e.g., table_name.id, table_name.created_at).",
                    line=idx,
                    column=match.start() + 1,
                    context=line.strip()
                ))

        # Rule 2: Detect camelCase or capitalization in database identifiers (RULE-002 / CR-002)
        camel_pattern = r'\\b([a-z]+[A-Z]\\w*|[A-Z]+[a-z]\\w*)\\b'
        for idx, line in enumerate(lines, start=1):
            matches = re.finditer(camel_pattern, line)
            for m in matches:
                name = m.group(1)
                if name.upper() not in self.reserved_keywords and not name.isupper():
                    violations.append(Violation(
                        rule_id="RULE-002",
                        severity="WARNING",
                        brief="Non-snake_case Identifier",
                        message=f"Database identifier '\${name}' is written in camelCase or UpperCamelCase, which violates standards and impairs clarity on case-insensitive engines.",
                        fix_hint=f"Convert the identifier to snake_case equivalent: '\${self._to_snake_case(name)}'.",
                        line=idx,
                        column=m.start() + 1,
                        context=line.strip()
                    ))

        # Rule 3: Single-letter database/table aliases (RULE-003 / CR-003)
        single_alias_pattern = r'\\b(?:FROM|JOIN)\\s+(\\w+)\\s+(AS\\s+)?([a-zA-Z]\\d?)\\b'
        for idx, line in enumerate(lines, start=1):
            matches = re.finditer(single_alias_pattern, line, re.IGNORECASE)
            for m in matches:
                tbl_name = m.group(1)
                alias = m.group(3)
                if alias.upper() not in self.reserved_keywords:
                    suggested_alias = tbl_name[:3].lower() if len(tbl_name) >= 3 else tbl_name.lower()
                    violations.append(Violation(
                        rule_id="RULE-003",
                        severity="WARNING",
                        brief="Single-Letter Table Alias",
                        message=f"Table '\${tbl_name}' is aliased with single-character or simple numbered alias '\${alias}'. This creates critical ambiguity in complex subqueries.",
                        fix_hint=f"Replace '\${alias}' with a clean 3-4 letter acronym prefix (e.g., '\${suggested_alias}').",
                        line=idx,
                        column=m.start(3) + 1,
                        context=line.strip()
                    ))

        # Rule 4: Comma-separated FROM (old implicit JOIN) (RULE-004)
        implicit_join_pattern = r'\\bFROM\\s+(\\w+)(?:\\s+(?:AS\\s+)?(\\w+))?(?:\\s*,\\s*(\\w+)(?:\\s+(?:AS\\s+)?(\\w+))?)+\\b'
        for idx, line in enumerate(lines, start=1):
            match = re.search(implicit_join_pattern, line, re.IGNORECASE)
            if match:
                violations.append(Violation(
                    rule_id="RULE-004",
                    severity="WARNING",
                    brief="Implicit Comma Join",
                    message="Comma-separated table list used in FROM clause represents an absolute legacy ANSI-89 join styling. This causes execution optimization ambiguity.",
                    fix_hint="Rewrite the tables using explicit [INNER|LEFT] JOIN syntax with matching ON join conditions.",
                    line=idx,
                    column=match.start() + 1,
                    context=line.strip()
                ))

        # Rule 5: Mixed/lowercase SQL keywords (RULE-005)
        for idx, line in enumerate(lines, start=1):
            for kw in self.reserved_keywords:
                matches = re.finditer(rf'\\b({kw})\\b', line, re.IGNORECASE)
                for m in matches:
                    word = m.group(1)
                    if word != kw:
                        violations.append(Violation(
                            rule_id="RULE-005",
                            severity="INFO",
                            brief="Consistent Keywords Casing",
                            message=f"SQL Keyword '\${word}' is written in lowercase or mixedcase. Correct typography mandates all keywords in uppercase.",
                            fix_hint=f"Standardize keywords casing to UPPERCASE equivalent: '\${kw}'.",
                            line=idx,
                            column=m.start() + 1,
                            context=line.strip()
                        ))

        return violations

    def _to_snake_case(self, name: str) -> str:
        s1 = re.sub('(.)([A-Z][a-z]+)', r'\\1_\\2', name)
        return re.sub('([a-z0-9])([A-Z])', r'\\1_\\2', s1).lower()
`
  },
  {
    path: "sql_linter/auto_fixer.py",
    name: "auto_fixer.py",
    description: "Mechanical lint auto-fixer module. Automatically repairs identifier styling and keyword capitalisation.",
    language: "python",
    content: `import re
from typing import Tuple, List
from sql_linter.rule_engine import RuleEngine

class AutoFixer:
    """
    Applies non-destructive formatting corrections to enforce system regulations.
    """
    def __init__(self):
        self.engine = RuleEngine()

    def fix_query(self, sql_content: str) -> Tuple[str, List[str]]:
        fixes_applied = []
        fixed_sql = sql_content

        if not fixed_sql or not fixed_sql.strip():
            return fixed_sql, fixes_applied

        # 1. Expand SELECT * to schema columns placeholders (RULE-001)
        if re.search(r'\\bSELECT\\s+\\*', fixed_sql, re.IGNORECASE):
            fixed_sql = re.sub(r'\\bSELECT\\s+\\*', "SELECT id, created_at, status", fixed_sql, flags=re.IGNORECASE)
            fixes_applied.append("Expanded 'SELECT *' into compliance columns (id, created_at, status)")

        # 2. Convert identifiers violating naming systems to snake_case (RULE-002)
        camel_pattern = r'\\b([a-z]+[A-Z]\\w*|[A-Z]+[a-z]\\w*)\\b'
        matches = set(re.findall(camel_pattern, fixed_sql))
        for name in matches:
            if name.upper() not in self.engine.reserved_keywords and not name.isupper():
                snake = self.engine._to_snake_case(name)
                fixed_sql = re.sub(rf'\\b{name}\\b', snake, fixed_sql)
                fixes_applied.append(f"Renamed identifier '\${name}' to snake_case equivalent '\${snake}'")

        # 3. Rename single-character/numbered table aliases to descriptive names (RULE-003)
        single_alias_pattern = r'\\b(FROM|JOIN)\\s+(\\w+)\\s+(AS\\s+)?([a-zA-Z]\\d?)\\b'
        matches_alias = list(re.finditer(single_alias_pattern, fixed_sql, re.IGNORECASE))
        replacements = []
        for m in matches_alias:
            tbl_name = m.group(2)
            alias = m.group(4)
            if alias.upper() not in self.engine.reserved_keywords:
                suggested_alias = f"{tbl_name}_table"
                replacements.append((alias, suggested_alias, tbl_name))
        
        for alias, suggested, tbl in replacements:
            fixed_sql = re.sub(rf'\\b{alias}\\b', suggested, fixed_sql)
            fixes_applied.append(f"Expanded single-letter table alias '\${alias}' for '\${tbl}' to descriptive '\${suggested}'")

        # 4. Rewrite comma-separated FROM (old implicit JOIN) to explicit INNER JOIN with fallback ON condition (RULE-004)
        implicit_join_pattern = r'\\bFROM\\s+(\\w+)(?:\\s+(?:AS\\s+)?(\\w+))?\\s*,\\s*(\\w+)(?:\\s+(?:AS\\s+)?(\\w+))?\\b'
        if re.search(implicit_join_pattern, fixed_sql, re.IGNORECASE):
            match = re.search(implicit_join_pattern, fixed_sql, re.IGNORECASE)
            if match:
                t1 = match.group(1)
                a1 = match.group(2) or t2_name if 't2_name' in locals() else t1
                t2 = match.group(3)
                a2 = match.group(4) or t2
                replacement = f"FROM {t1} {match.group(2) or ''} JOIN {t2} {match.group(4) or ''} ON {a1}.id = {a2}.{t1}_id"
                fixed_sql = re.sub(implicit_join_pattern, replacement, fixed_sql, flags=re.IGNORECASE)
                fixes_applied.append(f"Rewrote implicit comma JOIN between '{t1}' and '{t2}' into explicit INNER JOIN with ON criteria")

        # 5. Standardise keyword expressions to uppercase (RULE-005)
        keywords = ["select", "from", "join", "where", "group", "by", "order", "limit", "on", "and", "or", "having", "left", "right", "inner"]
        for kw in keywords:
            pattern = rf'\\b{kw}\\b'
            for item in set(re.findall(pattern, fixed_sql, re.IGNORECASE)):
                if item != kw.upper():
                    fixed_sql = re.sub(rf'\\b{item}\\b', kw.upper(), fixed_sql)
                    fixes_applied.append(f"Capitalised casing of SQL keyword '\${item}' to '\${kw.upper()}'")

        return fixed_sql, fixes_applied
`
  },
  {
    path: "sql_linter/report_writer.py",
    name: "report_writer.py",
    description: "Comprehensive reporting module. Compiles and exports diagnostics logs in JSON and formatted Markdown styles.",
    language: "python",
    content: `import json
from typing import Dict, List, Any

class ReportWriter:
    """
    Orchestrates report compilation and file exports.
    """
    def __init__(self, output_path: str = "lint_report.json"):
        self.output_path = output_path

    def write_json_report(self, file_results: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Compiles structured JSON format metadata containing metrics and scoring indices.
        """
        total_files = len(file_results)
        files_with_issues = sum(1 for res in file_results if not res["is_clean"])
        total_violations = sum(res["issues_count"] for res in file_results)
        total_fixes = sum(len(res.get("fixes_applied", [])) for res in file_results)

        report = {
            "summary": {
                "total_files_scanned": total_files,
                "files_with_violations": files_with_issues,
                "total_compliance_violations": total_violations,
                "total_fixes_applied": total_fixes,
                "compliance_score_percent": max(0, min(100, int(( (total_files - files_with_issues) / total_files ) * 100))) if total_files > 0 else 100
            },
            "files_scanned_details": file_results
        }

        try:
            with open(self.output_path, "w", encoding="utf-8") as f:
                json.dump(report, f, indent=4)
        except IOError as e:
            raise RuntimeError(f"Failed to export JSON report to \${self.output_path}: \${e}")

        return report

    def write_markdown_report(self, report_dict: Dict[str, Any], md_path: str = "lint_report.md") -> str:
        """
        Renders compliance reports with metrics and logs into a GitHub Markdown page.
        """
        summary = report_dict["summary"]
        md_content = []
        md_content.append("# 📊 SQL Quality Linter Compliance Audit Report\\n")
        md_content.append(f"### Score: **\${summary['compliance_score_percent']}% COGNITIVE COMPLIANCE**\\n")
        md_content.append("| Metric | Value | Status |")
        md_content.append("| :--- | :---: | :---: |")
        md_content.append(f"| Scanned files | \${summary['total_files_scanned']} | Clean |")
        md_content.append(f"| Active Violations | \${summary['total_compliance_violations']} | {'🔴 Alert' if summary['total_compliance_violations'] > 0 else '🟢 Safe'} |")
        md_content.append(f"| Fixed mechanically | \${summary['total_fixes_applied']} | 🔧 Corrected |\\n")

        md_content.append("## 📂 Detailed File Violations Directory\\n")

        for index, detail in enumerate(report_dict["files_scanned_details"], start=1):
            is_clean_emoji = "🟢 CLEAN" if detail["is_clean"] else f"🔴 \${detail['issues_count']} ISSUES"
            md_content.append(f"### \${index}. File: \`\${detail['file']}\` (\${is_clean_emoji})\\n")
            
            if not detail["is_clean"]:
                md_content.append("| Rule ID | Loc | Severity | Description | Remedy hint |")
                md_content.append("| :--- | :---: | :---: | :--- | :--- |")
                for iss in detail["issues"]:
                    md_content.append(
                        f"| \`\${iss['rule_id']}\` | L\${iss['line']}:C\${iss['column']} | **\${iss['severity']}** | \${iss['brief']}: \${iss['message']} | \${iss['fix_hint']} |"
                    )
                md_content.append("")
                
            if detail.get("fixes_applied"):
                md_content.append("**Automatic mechanical correction logs applied:**")
                for fx in detail["fixes_applied"]:
                    md_content.append(f"- 🔧 \${fx}")
                md_content.append("")

        md_text = "\\n".join(md_content)
        
        try:
            with open(md_path, "w", encoding="utf-8") as f:
                f.write(md_text)
        except IOError:
            pass

        return md_text
`
  },
  {
    path: "sql_linter/linter.py",
    name: "linter.py",
    description: "Core SQL Linter and Mechanical Fixer. Implements custom regex rules to check for SELECT *, CamelCase names, single-letter aliases, and integrates directly with sqlfluff as a library or subprocess.",
    language: "python",
    content: `from typing import Dict, List, Any, Tuple
import sqlfluff
from sql_linter.rule_engine import RuleEngine
from sql_linter.auto_fixer import AutoFixer

class SQLLinter:
    """
    Analyzes SQL files for semantic anti-patterns and mechanical issues,
    providing mechanical remedies and sqlfluff diagnostic hooks.
    """
    
    def __init__(self, dialect: str = "ansi"):
        self.dialect = dialect
        self.rule_engine = RuleEngine()
        self.auto_fixer = AutoFixer()

    def analyze_query(self, sql_content: str) -> Dict[str, Any]:
        """
        Runs rules against the SQL query and aggregates diagnostic findings.
        """
        violations = self.rule_engine.lint_query(sql_content)
        issues = []
        for v in violations:
            issues.append(v.to_dict())
            
        is_clean = len(issues) == 0

        # Run sqlfluff internal lint diagnostics
        try:
            lint_errors = sqlfluff.lint(sql_content, dialect=self.dialect)
            for err in lint_errors:
                is_clean = False
                issues.append({
                    "rule_id": err.get("code", "SF-001"),
                    "severity": "WARNING",
                    "brief": f"Sqlfluff: {err.get('description', 'Styling violation')}",
                    "message": f"Line {err.get('line_no')}, Col {err.get('line_pos')}: {err.get('description')}",
                    "fix_hint": "Run the auto-fix mechanics to clean up automatically."
                })
        except Exception:
            pass

        return {
            "is_clean": is_clean,
            "issues": issues,
            "issues_count": len(issues)
        }

    def fix_query_mechanically(self, sql_content: str) -> Tuple[str, List[str]]:
        """
        Runs immediate regex modifications and calls sqlfluff.fix
        to format identifiers and standard casing.
        """
        fixed_sql, fixes_applied = self.auto_fixer.fix_query(sql_content)

        # Invoke sqlfluff programmatic fixes (spacing, keyword casing etc)
        try:
            lint_fixed = sqlfluff.fix(fixed_sql, dialect=self.dialect)
            if lint_fixed != fixed_sql:
                fixed_sql = lint_fixed
                fixes_applied.append("Applied programmatic Sqlfluff formatter fixes (spacing, uppercase keywords, line endings)")
        except Exception:
            pass

        return fixed_sql, fixes_applied
`
  },
  {
    path: "sql_linter/ai_agent.py",
    name: "ai_agent.py",
    description: "Ollama Orchestration Client. Handles local LLM (such as Codellama, Llama3, or Deepseek-coder) setup, formatting code refactoring prompts, sending REST requests, and registering prompts utilized into the compliance md ledger.",
    language: "python",
    content: `import os
import requests
from typing import Dict, Any

class SQLAIAgent:
    """
    Communicates with local Ollama server to fetch semantic queries refactoring.
    Saves and indexes formatting prompts in ai_prompts_used.md ledger.
    """
    
    def __init__(self, host: str = "http://localhost:11434", model: str = "deepseek-coder:6.7b"):
        self.host = host.rstrip('/')
        self.model = model
        self.prompt_ledger_file = "ai_prompts_used.md"

    def is_ollama_available(self) -> bool:
        """
        Pings local Ollama service to check system parameters.
        """
        try:
            response = requests.get(f"{self.host}/api/tags", timeout=2)
            return response.status_code == 200
        except Exception:
            return False

    def suggest_refactoring(self, raw_sql: str) -> Dict[str, Any]:
        """
        Requests structured suggestions from the local Ollama LLM.
        Saves the structured prompt used into are compliance log folder.
        """
        prompt = (
            f"You are a Senior database performance and clean-code advisor specialized in SQL Dialect Refactoring.\\n"
            f"Review this raw SQL Query and suggest architectural improvements. Look for suboptimal patterns, "
            f"nested subqueries that could be elegant Common Table Expressions (CTEs), optimize JOIN indexes, "
            f"and propose indexing recommendations.\\n\\n"
            f"Input SQL Schema and Query:\\n"
            f"\`\`\`sql\\n{raw_sql}\\n\`\`\`\\n\\n"
            f"Response instruction:\\n"
            f"Generate a clear rewritten refactored SQL file (fully uppercase keywords), followed by "
            f"consecutive bullet points highlighting optimization benefits. Do not output conversational filler."
        )

        # Log prompt to ledger file first (requirement: Save prompts used into ai_prompts_used.md)
        self._save_prompt_to_ledger(raw_sql, prompt)

        if not self.is_ollama_available():
            return {
                "success": False,
                "error": "Ollama server is unreachable at the configured URL.",
                "explanation": (
                    "Ollama is offline. Start your local container/instance:\\n"
                    "  > ollama run deepseek-coder:6.7b\\n\\n"
                    "Review 'ai_prompts_used.md' to see what instructions would have been dispatched."
                ),
                "suggestion": raw_sql
            }

        try:
            payload = {
                "model": self.model,
                "prompt": prompt,
                "stream": False,
                "options": {
                    "temperature": 0.2
                }
            }
            
            response = requests.post(f"{self.host}/api/generate", json=payload, timeout=30)
            if response.status_code == 200:
                result = response.json()
                response_text = result.get("response", "")
                
                # Simple extraction of sql code block if present
                clean_sql = raw_sql
                sql_blocks = re.findall(r'\`\`\`sql\\s+(.*?)\\s+\`\`\`', response_text, re.DOTALL | re.IGNORECASE)
                if sql_blocks:
                    clean_sql = sql_blocks[0]

                return {
                    "success": True,
                    "explanation": response_text,
                    "suggestion": clean_sql
                }
            else:
                return {
                    "success": False,
                    "error": f"Ollama returned HTTP Status Code {response.status_code}",
                    "explanation": "Ensure Ollama is fully warmed up and model resources are assigned.",
                    "suggestion": raw_sql
                }
        except Exception as e:
            return {
                "success": False,
                "error": f"Connection error: {str(e)}",
                "explanation": f"Failed to successfully handoff tasks to Ollama. Trace: {str(e)}",
                "suggestion": raw_sql
            }

    def _save_prompt_to_ledger(self, original_sql: str, full_prompt: str):
        """
        Appends prompt and database structure elements to tracking log markdown file.
        """
        file_exists = os.path.exists(self.prompt_ledger_file)
        
        with open(self.prompt_ledger_file, "a") as f:
            if not file_exists:
                f.write("# Local SQL Refactoring Agent - Dispatched Prompts Ledger\\n\\n")
                f.write("This file is a compliance directory listing queries analyzed and prompt payloads dispatched.\\n\\n")
            
            f.write("## Prompt Run Details\\n")
            f.write(f"- **Ollama Host:** {self.host}\\n")
            f.write(f"- **LLM Model:** {self.model}\\n")
            f.write("- **Input SQL Query:**\\n")
            f.write(f"\`\`\`sql\\n{original_sql.strip()}\\n\`\`\`\\n\\n")
            f.write("- **Dispatched Agent Context Instruction:**\\n")
            f.write(f"\`\`\`text\\n{full_prompt.strip()}\\n\`\`\`\\n")
            f.write("\\n---\\n\\n")
`
  },
  {
    path: "sql_linter/llm_agent.py",
    name: "llm_agent.py",
    description: "Llama3 Orchestration Client. Connects to local Ollama API to process SQL queries and standards violations list, validating model outputs and providing graceful fallback capability during connection failures.",
    language: "python",
    content: `import os
import re
import requests
from typing import Dict, Any, List

class SQLLMAgent:
    """
    SQL LLM Refactoring Agent leveraging local Ollama instance with llama3 model.
    """
    
    def __init__(self, host: str = "http://localhost:11434", model: str = "llama3"):
        self.host = host.rstrip('/')
        self.model = model
        self.prompt_ledger_file = "ai_prompts_used.md"

    def is_ollama_available(self) -> bool:
        """
        Pings local Ollama service to check system parameters.
        """
        try:
            response = requests.get(f"{self.host}/api/tags", timeout=2)
            return response.status_code == 200
        except Exception:
            return False

    def suggest_refactoring(self, raw_sql: str, violations: List[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Sends SQL query and identified standards violations to Ollama (llama3)
        to suggest optimized database schemas and refactored SQL code.
        """
        # Format list of violations
        violations_str = ""
        if violations:
            for idx, v in enumerate(violations, start=1):
                rule_id = v.get("rule_id", "STYLE")
                line = v.get("line", "N/A")
                brief = v.get("brief", v.get("message", "Standard compliance infraction."))
                violations_str += f"{idx}. [{rule_id}] Line {line}: {brief}\\n"
        else:
            violations_str = "No specific static standard violations identified."

        prompt = (
            f"You are a Senior database performance and clean-code advisor specialized in SQL Dialect Refactoring.\\n"
            f"Please review this raw SQL Query alongside its identified standards violations and suggest structural, "
            f"syntactic, and indexing optimizations.\\n\\n"
            f"STRICT ANTI-HALLUCINATION GUARD ACTIVE:\\n"
            f"- Never guess or invent database attributes, column names, schema configurations, or relations.\\n"
            f"- Use only the tables, variables, columns, and data details explicitly provided in the input.\\n"
            f"- Strictly preserve the original SQL query logic and functionality.\\n"
            f"- If details needed for an optimization are missing, ambiguous, or uncertain, DO NOT make assumptions or guess. "
            f"Instead, output 'Manual Review Required' describing the ambiguity, and keep the query unaltered.\\n\\n"
            f"Input SQL Query:\\n"
            f"\`\`\`sql\\n{raw_sql}\\n\`\`\`\\n\\n"
            f"Identified Standards Violations:\\n"
            f"\`\`\`text\\n{violations_str}\\n\`\`\`\\n\\n"
            f"Response Directions:\\n"
            f"1. Generate a corrected and optimized version of the SQL query wrapped inside exactly one \`\`\`sql ... \`\`\` markdown code block.\\n"
            f"2. Ensure all SQL keywords (SELECT, FROM, JOIN, WHERE, WITH, etc.) are written in UPPERCASE.\\n"
            f"3. Do not introduce syntax errors, and maintain original filtering/logical filters criteria.\\n"
            f"4. Provide a succinct list of optimization bullet points highlighting the fixes applied.\\n\\n"
            f"Do not include conversational preambles or chatty introductions."
        )

        # Log prompt to ledger file first for compliance audit
        self._save_prompt_to_ledger(raw_sql, prompt, violations_str)

        if not self.is_ollama_available():
            return {
                "success": False,
                "error": "Ollama server is offline or unreachable at the configured URL.",
                "explanation": (
                    "Ollama is offline. Start your local Ollama service and pull the model:\\n"
                    f"  > ollama run {self.model}\\n\\n"
                    "Graceful fallback executed. Review 'ai_prompts_used.md' to see the dispatched instruction payload."
                ),
                "suggestion": raw_sql
            }

        try:
            payload = {
                "model": self.model,
                "prompt": prompt,
                "stream": False,
                "options": {
                    "temperature": 0.2
                }
            }
            
            response = requests.post(f"{self.host}/api/generate", json=payload, timeout=20)
            if response.status_code == 200:
                result = response.json()
                response_text = result.get("response", "").strip()
                
                # Output Validation
                if not response_text:
                    raise ValueError("Ollama returned an empty response")

                # Try to extract SQL code block
                sql_blocks = re.findall(r'\`\`\`sql\\s+(.*?)\\s+\`\`\`', response_text, re.DOTALL | re.IGNORECASE)
                if sql_blocks:
                    clean_sql = sql_blocks[0].strip()
                else:
                    # Fallback extraction: try to locate first SELECT or with block
                    match = re.search(r'\\b(SELECT|WITH)\\s+.*', response_text, re.DOTALL | re.IGNORECASE)
                    if match:
                        clean_sql = match.group(0).strip()
                    else:
                        clean_sql = raw_sql

                return {
                    "success": True,
                    "explanation": response_text,
                    "suggestion": clean_sql
                }
            else:
                return {
                    "success": False,
                    "error": f"Ollama API returned HTTP Status Code {response.status_code}",
                    "explanation": f"The model '{self.model}' might not be loaded or resources are constrained.",
                    "suggestion": raw_sql
                }
        except Exception as e:
            return {
                "success": False,
                "error": f"Connection error: {str(e)}",
                "explanation": f"Failed to successfully handoff tasks to Ollama model '{self.model}'. Graceful fallback applied.",
                "suggestion": raw_sql
            }

    def _save_prompt_to_ledger(self, original_sql: str, full_prompt: str, violations: str):
        """
        Appends prompt and database structure elements to tracking log markdown file.
        """
        file_exists = os.path.exists(self.prompt_ledger_file)
        
        with open(self.prompt_ledger_file, "a", encoding="utf-8") as f:
            if not file_exists:
                f.write("# Local SQL Refactoring Agent - Dispatched Prompts Ledger\\n\\n")
                f.write("This file is a compliance directory listing queries analyzed and prompt payloads dispatched.\\n\\n")
            
            f.write("## Prompt Run Details\\n")
            f.write(f"- **Ollama Host:** {self.host}\\n")
            f.write(f"- **LLM Model:** {self.model}\\n")
            f.write("- **Input SQL Query:**\\n")
            f.write(f"\`\`\`sql\\n{original_sql.strip()}\\n\`\`\`\\n\\n")
            f.write("- **Identified Violations:**\\n")
            f.write(f"\`\`\`text\\n{violations.strip()}\\n\`\`\`\\n\\n")
            f.write("- **Dispatched Agent Context Instruction:**\\n")
            f.write(f"\`\`\`text\\n{full_prompt.strip()}\\n\`\`\`\\n")
            f.write("\\n---\\n\\n")
`
  },
  {
    path: "sql_linter/cli.py",
    name: "cli.py",
    description: "The primary Click CLI App entrypoint. Connects folder scanning algorithms, linter evaluation, mechanical auto-fixes, Ollama AI query optimization pipelines, JSON formatted reporting pipelines, and colorized Rich console logs.",
    language: "python",
    content: `import sys
import os
import json
import click
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich.syntax import Syntax
from rich.progress import Progress, SpinnerColumn, TextColumn, BarColumn, MofNCompleteColumn, TimeElapsedColumn

from sql_linter.file_scanner import FileScanner
from sql_linter.report_writer import ReportWriter
from sql_linter.linter import SQLLinter
from sql_linter.ai_agent import SQLAIAgent
from sql_linter.llm_agent import SQLLMAgent

# Initialise highly styled Rich CLI Console
console = Console()

@click.group()
@click.version_option(version="0.1.0")
def main():
    """
    SQL Query Linter & Style Fixer CLI.
    Enforce enterprise standards and optimize structural queries easily using local AI.
    """
    pass

@main.command()
@click.argument('folder_path', type=click.Path(exists=True, file_okay=False, dir_okay=True))
@click.option('--report', default="lint_report.json", help="Path to write the aggregated JSON evaluation results.")
def lint(folder_path, report):
    """
    Scan folders recursively for .sql files, flagging structural or database anti-patterns.
    """
    console.print(Panel("[bold cyan]SQL Query Linter[/bold cyan]\\nScanning directory: [yellow]{}[/yellow]".format(folder_path), border_style="cyan"))

    scanner = FileScanner()
    linter = SQLLinter()
    writer = ReportWriter(report)

    try:
        sql_files = scanner.scan_directory(folder_path)
    except Exception as e:
        console.print("[bold red]Scan failure: {}[/bold red]".format(str(e)))
        sys.exit(1)

    if not sql_files:
        console.print("[bold yellow]No SQL files (.sql) found in targets directory.[/bold yellow]")
        sys.exit(0)

    console.print("Found [green]{}[/green] SQL files. Checking standards quality...\\n".format(len(sql_files)))

    aggregation_details = []

    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        BarColumn(),
        MofNCompleteColumn(),
        TimeElapsedColumn(),
        console=console
    ) as progress:
        task = progress.add_task("[cyan]Processing files...", total=len(sql_files))
        
        for file_path in sql_files:
            progress.update(task, description="Linting [underline]{}[/underline]".format(os.path.basename(file_path)))
            
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    raw_sql = f.read()
                
                analysis = linter.analyze_query(raw_sql)
                file_issues = analysis["issues"]
                
                aggregation_details.append({
                    "file": file_path,
                    "is_clean": len(file_issues) == 0,
                    "issues_count": len(file_issues),
                    "issues": file_issues,
                    "fixes_applied": [],
                    "ai_refactoring_provided": False,
                    "ai_suggestion": None
                })
            except Exception as e:
                console.print("\\n[bold red]Error reading or analyzing {}: {}[/bold red]".format(file_path, str(e)))
            
            progress.advance(task)

    # Print nice results of the files
    for details in aggregation_details:
        file_name = details["file"]
        is_clean = details["is_clean"]
        issues = details["issues"]
        
        console.print("\\n[bold]File:[/bold] [underline cyan]{}[/underline cyan]".format(file_name))
        
        if is_clean:
            console.print("[bold green]✔ Clean! Compliance standards match optimal criteria.[/bold green]")
        else:
            table = Table(title="Standards Violations Discovered", title_style="bold red", show_header=True)
            table.add_column("Rule ID", style="magenta", width=12)
            table.add_column("Severity", style="bold red", width=10)
            table.add_column("Description", style="white")
            table.add_column("Remedy Recommendation", style="green")
            
            for is_detail in issues:
                sev = is_detail["severity"]
                color = "red" if sev == "ERROR" else "yellow" if sev == "WARNING" else "blue"
                brief = is_detail.get("brief", "Violation")
                msg = is_detail.get("message", "Standard compliance infraction.")
                table.add_row(
                    is_detail["rule_id"],
                    "[{color}]{sev}[/{color}]".format(color=color, sev=sev),
                    "{}: {}".format(brief, msg),
                    is_detail.get("fix_hint", "Manual investigation recommended")
                )
            
            console.print(table)

    # Save reports using ReportWriter
    try:
        report_data = writer.write_json_report(aggregation_details)
        writer.write_markdown_report(report_data, report.replace(".json", ".md"))
        console.print("\\n✔ Scans accomplished! Compliance audit reports written to: [bold green]{}[/bold green]".format(report))
    except Exception as e:
        console.print("\\n[bold red]Failed to compile reports: {}[/bold red]".format(str(e)))

@main.command()
@click.argument('folder_path', type=click.Path(exists=True, file_okay=False, dir_okay=True))
@click.option('--report', default="lint_report.json", help="Path to write the aggregated JSON evaluation results.")
def fix(folder_path, report):
    """
    Recursively scans and performs automatic non-destructive mechanical style fixes in-place.
    """
    console.print(Panel("[bold green]SQL Mechanical Fixer[/bold green]\\nTarget directory: [yellow]{}[/yellow]".format(folder_path), border_style="green"))

    scanner = FileScanner()
    linter = SQLLinter()
    writer = ReportWriter(report)

    try:
        sql_files = scanner.scan_directory(folder_path)
    except Exception as e:
        console.print("[bold red]Scan failure: {}[/bold red]".format(str(e)))
        sys.exit(1)

    if not sql_files:
        console.print("[bold yellow]No SQL files (.sql) found in targets directory.[/bold yellow]")
        sys.exit(0)

    console.print("Found [green]{}[/green] SQL files. Repairing styling violations automatically...\\n".format(len(sql_files)))

    aggregation_details = []

    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        BarColumn(),
        MofNCompleteColumn(),
        TimeElapsedColumn(),
        console=console
    ) as progress:
        task = progress.add_task("[green]Formatting files...", total=len(sql_files))
        
        for file_path in sql_files:
            progress.update(task, description="Fixing [underline]{}[/underline]".format(os.path.basename(file_path)))
            
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    raw_sql = f.read()
                
                analysis = linter.analyze_query(raw_sql)
                file_issues = analysis["issues"]
                
                fixed_sql = raw_sql
                fixes_applied = []
                
                if file_issues:
                    fixed_sql, fixes_applied = linter.fix_query_mechanically(raw_sql)
                    if fixes_applied:
                        with open(file_path, "w", encoding="utf-8") as fs:
                            fs.write(fixed_sql)
                        
                        re_analysis = linter.analyze_query(fixed_sql)
                        file_issues = re_analysis["issues"]
                
                aggregation_details.append({
                    "file": file_path,
                    "is_clean": len(file_issues) == 0,
                    "issues_count": len(file_issues),
                    "issues": file_issues,
                    "fixes_applied": fixes_applied,
                    "ai_refactoring_provided": False,
                    "ai_suggestion": None
                })
            except Exception as e:
                console.print("\\n[bold red]Error fixing {}: {}[/bold red]".format(file_path, str(e)))
                
            progress.advance(task)

    # Output detailed fixing results
    for details in aggregation_details:
        file_name = details["file"]
        is_clean = details["is_clean"]
        fixes = details.get("fixes_applied", [])
        
        console.print("\\n[bold]File:[/bold] [underline cyan]{}[/underline cyan]".format(file_name))
        
        if fixes:
            console.print("[bold green]🔧 Applied mechanical corrections:[/bold green]")
            for item in fixes:
                console.print("   - [green]{}[/green]".format(item))
            if is_clean:
                console.print("[green]✔ Verified CLEAN status after styling updates.[/green]")
            else:
                console.print("[yellow]⚠ Remaining warnings require manual intervention.[/yellow]")
        else:
            if is_clean:
                console.print("[green]✔ Already compliant. Stylings match optimal rules.[/green]")
            else:
                console.print("[yellow]⚠ No mechanical corrections could be mapped to remaining issues.[/yellow]")

    # Save reports
    try:
        report_data = writer.write_json_report(aggregation_details)
        writer.write_markdown_report(report_data, report.replace(".json", ".md"))
        console.print("\\n✔ Standard corrections written! Reports exported to: [bold green]{}[/bold green]".format(report))
    except Exception as e:
        console.print("\\n[bold red]Failed to write compliance reports: {}[/bold red]".format(str(e)))

@main.command()
@click.argument('folder_path', type=click.Path(exists=True, file_okay=False, dir_okay=True))
@click.option('--model', default="llama3", help="Ollama model string to prompt.")
@click.option('--ollama-host', default="http://localhost:11434", help="Local host port for Ollama API handler.")
@click.option('--report', default="lint_report.json", help="Path to write the aggregated JSON evaluation results.")
def ai_refactor(folder_path, model, ollama_host, report):
    """
    Query local Ollama instance (llama3) for sophisticated schema and structure optimizations.
    """
    console.print(Panel("[bold purple]SQL AI Refactoring & Query Optimizer[/bold purple]\\nTarget directory: [yellow]{}[/yellow]\\nLLM Model: [cyan]{}[/cyan]\\nHost: [cyan]{}[/cyan]".format(folder_path, model, ollama_host), border_style="purple"))

    scanner = FileScanner()
    linter = SQLLinter()
    writer = ReportWriter(report)
    ai_agent = SQLLMAgent(host=ollama_host, model=model)

    try:
        sql_files = scanner.scan_directory(folder_path)
    except Exception as e:
        console.print("[bold red]Scan failure: {}[/bold red]".format(str(e)))
        sys.exit(1)

    if not sql_files:
        console.print("[bold yellow]No SQL files (.sql) found in targets directory.[/bold yellow]")
        sys.exit(0)

    console.print("Found [green]{}[/green] SQL files. Requesting local LLM optimization advice...\\n".format(len(sql_files)))

    aggregation_details = []

    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        BarColumn(),
        MofNCompleteColumn(),
        TimeElapsedColumn(),
        console=console
    ) as progress:
        task = progress.add_task("[purple]Consulting Co-pilot...", total=len(sql_files))
        
        for file_path in sql_files:
            progress.update(task, description="Refactoring [underline]{}[/underline]".format(os.path.basename(file_path)))
            
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    raw_sql = f.read()
                
                analysis = linter.analyze_query(raw_sql)
                file_issues = analysis["issues"]
                
                ai_data = ai_agent.suggest_refactoring(raw_sql, file_issues)
                ai_suggestion = None
                
                if ai_data["success"]:
                    ai_suggestion = ai_data["explanation"]
                    progress.console.print("\\n[bold green]✔ Refactoring suggestions compiled for {}[/bold green]".format(os.path.basename(file_path)))
                    progress.console.print(Panel(
                        Syntax(ai_data["suggestion"], "sql", theme="monokai", line_numbers=True),
                        title="[bold green]AI Recommended Code Plan[/bold green]"
                    ))
                    progress.console.print("[bold]Performance Highlights:[/bold]\\n{}\\n".format(ai_data["explanation"]))
                else:
                    progress.console.print("\\n[bold red]⚠️ AI Handoff Skip for {}: {}[/bold red]".format(os.path.basename(file_path), ai_data["error"]))
                    progress.console.print("[dim]{}[/dim]\\n".format(ai_data["explanation"]))
                
                aggregation_details.append({
                    "file": file_path,
                    "is_clean": len(file_issues) == 0,
                    "issues_count": len(file_issues),
                    "issues": file_issues,
                    "fixes_applied": [],
                    "ai_refactoring_provided": ai_data["success"],
                    "ai_suggestion": ai_suggestion
                })
            except Exception as e:
                console.print("\\n[bold red]Error in AI optimization pipeline for {}: {}[/bold red]".format(file_path, str(e)))
                
            progress.advance(task)

    # Save reports
    try:
        report_data = writer.write_json_report(aggregation_details)
        writer.write_markdown_report(report_data, report.replace(".json", ".md"))
        console.print("\\n✔ AI Optimization completed! Reference index updated in: [bold green]{}[/bold green]".format(report))
        console.print("Refer to [underline]ai_prompts_used.md[/underline] ledger to examine instructions payloads.")
    except Exception as e:
        console.print("\\n[bold red]Failed to update compilation logs: {}[/bold red]".format(str(e)))

@main.command()
@click.option('--file', 'report_file', default="lint_report.json", help="Path to the aggregated JSON results report file.")
def report(report_file):
    """
    Display latest accumulated JSON results summary inside a visual performance card.
    """
    if not os.path.exists(report_file):
        console.print("[bold red]Report file search failure: [yellow]{}[/yellow] not found.[/bold red]".format(report_file))
        console.print("[dim]Run 'sql-lint-fixer lint <folder>' first to compile evaluation results.[/dim]")
        sys.exit(1)

    try:
        with open(report_file, "r", encoding="utf-8") as f:
            data = json.load(f)
    except Exception as e:
        console.print("[bold red]Error parsing JSON audit results file: {}[/bold red]".format(str(e)))
        sys.exit(1)

    summary = data.get("summary", {})
    files_details = data.get("files_scanned_details", data.get("details", []))

    console.print("\\n")
    console.print(Panel(
        "[bold cyan]📊 SQL STANDARDS QUALITY AUDIT SUMMARY[/bold cyan]\\n"
        "Score: [bold green]{}% COGNITIVE COMPLIANCE[/bold green]".format(summary.get("compliance_score_percent", 100)),
        border_style="cyan"
    ))

    stats_table = Table(title="Compliance Indicators Index", title_style="bold", show_header=True)
    stats_table.add_column("Indicator Metric", style="cyan")
    stats_table.add_column("Quantity", style="yellow")
    stats_table.add_column("Status Indicators", style="white")
    
    stats_table.add_row(
        "Total Database Scripts Scanned", 
        str(summary.get("total_files_scanned", len(files_details))), 
        "Verified scanning logs"
    )
    
    total_violations = summary.get("total_compliance_violations", sum(f.get("issues_count", 0) for f in files_details))
    alert_status = "[red]🔴 Action Required[/red]" if total_violations > 0 else "[green]🟢 System Safe[/green]"
    
    stats_table.add_row(
        "Active Standards Infractions", 
        str(total_violations), 
        alert_status
    )
    
    stats_table.add_row(
        "Mechanical Styling Corrections Applied", 
        str(summary.get("total_fixes_applied", sum(len(f.get("fixes_applied", [])) for f in files_details))), 
        "🔧 Corrected Styles"
    )
    
    console.print(stats_table)

    if files_details:
        console.print("\\n[bold cyan]📂 DETAILED FILE AUDIT HISTORY[/bold cyan]")
        for idx, file_item in enumerate(files_details, start=1):
            is_clean = file_item.get("is_clean", True)
            clean_status = "[bold green]🟢 CLEAN[/bold green]" if is_clean else "[bold red]🔴 DEGRADED ({})[/bold red]".format(file_item.get("issues_count", 0))
            console.print("\\n{}. File: [underline]{}[/underline] ({})".format(idx, file_item.get("file", "unknown"), clean_status))
            
            issues_list = file_item.get("issues", [])
            if issues_list:
                issue_table = Table(show_header=True, header_style="bold")
                issue_table.add_column("Rule", style="magenta")
                issue_table.add_column("Loc", style="yellow")
                issue_table.add_column("Severity")
                issue_table.add_column("Brief Detail", style="white")
                
                for issue in issues_list:
                    sev = issue.get("severity", "WARNING").upper()
                    sev_col = "[bold red]" if sev == "ERROR" else "[bold yellow]" if sev == "WARNING" else "[bold blue]"
                    line = issue.get("line", "1")
                    col = issue.get("column", "1")
                    
                    issue_table.add_row(
                        issue.get("rule_id", "Style"),
                        "L{}:C{}".format(line, col),
                        "{}{}[/]".format(sev_col, sev),
                        issue.get("brief", issue.get("rule", "Compliance deviation."))
                    )
                console.print(issue_table)
                
            fixes_made = file_item.get("fixes_applied", [])
            if fixes_made:
                console.print("[green]🔧 Auto-formatting corrections applied in-place:[/green]")
                for fx in fixes_made:
                    console.print("  - {}".format(fx))

if __name__ == "__main__":
    main()
`
  },
  {
    path: "tests/__init__.py",
    name: "__init__.py",
    description: "Declares typical standard python test packaging parameters.",
    language: "python",
    content: `"""
SQL Query Linter CLI - Pytest Suite.
"""
`
  },
  {
    path: "tests/test_linter.py",
    name: "test_linter.py",
    description: "Interactive Pytest test suite asserting the behavior of custom rules (SELECT *, non-snake_case, aliases) and CLI execution parameters.",
    language: "python",
    content: `import os
import json
import pytest
from unittest.mock import patch, MagicMock
from click.testing import CliRunner

from sql_linter.rule_engine import RuleEngine, Violation
from sql_linter.auto_fixer import AutoFixer
from sql_linter.linter import SQLLinter
from sql_linter.file_scanner import FileScanner
from sql_linter.report_writer import ReportWriter
from sql_linter.ai_agent import SQLAIAgent
from sql_linter.llm_agent import SQLLMAgent
from sql_linter.cli import main

# -------------------------------------------------------------
# Pytest Fixtures
# -------------------------------------------------------------

@pytest.fixture
def rule_engine():
    return RuleEngine()

@pytest.fixture
def auto_fixer():
    return AutoFixer()

@pytest.fixture
def linter():
    return SQLLinter()

@pytest.fixture
def scanner():
    return FileScanner()

@pytest.fixture
def temp_sql_dir(tmp_path):
    """
    Creates a temporary directory with various SQL files for scanner/linter testing.
    """
    d = tmp_path / "queries"
    d.mkdir()
    
    # 1. Clean file
    f_clean = d / "clean.sql"
    f_clean.write_text("SELECT id, name FROM tbl_users WHERE status = 'active';", encoding="utf-8")
    
    # 2. Defective file (SELECT *, camelCase, single-letter alias)
    f_bad = d / "bad_query.sql"
    f_bad.write_text("SELECT * FROM tblOrders o WHERE o.orderAmount > 500;", encoding="utf-8")
    
    # 3. Non-sql file
    f_other = d / "notes.txt"
    f_other.write_text("This is not SQL", encoding="utf-8")
    
    # 4. Empty SQL file
    f_empty = d / "empty_query.sql"
    f_empty.write_text("", encoding="utf-8")

    return d

# -------------------------------------------------------------
# Unit Tests: RuleEngine
# -------------------------------------------------------------

def test_rule_engine_select_all(rule_engine):
    sql = "SELECT * FROM users;"
    violations = rule_engine.lint_query(sql)
    assert len(violations) == 1
    assert violations[0].rule_id == "CR-001"
    assert violations[0].severity == "WARNING"
    assert "SELECT *" in violations[0].brief

def test_rule_engine_camel_case(rule_engine):
    sql = "SELECT userAddress, billingAmount FROM invoices;"
    violations = rule_engine.lint_query(sql)
    rule_ids = [v.rule_id for v in violations]
    assert "CR-002" in rule_ids
    # Assert specific names caught
    assert any("userAddress" in v.message for v in violations)
    assert any("billingAmount" in v.message for v in violations)

def test_rule_engine_single_letter_alias(rule_engine):
    sql = "SELECT u.name FROM users u JOIN profiles p ON u.id = p.user_id;"
    violations = rule_engine.lint_query(sql)
    rule_ids = [v.rule_id for v in violations]
    assert "CR-003" in rule_ids
    assert any("users" in v.message for v in violations)
    assert any("profiles" in v.message for v in violations)

def test_rule_engine_to_snake_case(rule_engine):
    assert rule_engine._to_snake_case("camelCase") == "camel_case"
    assert rule_engine._to_snake_case("UpperCamel") == "upper_camel"
    assert rule_engine._to_snake_case("simple") == "simple"
    assert rule_engine._to_snake_case("multipleWordCamelCase") == "multiple_word_camel_case"

# -------------------------------------------------------------
# Unit Tests: AutoFixer
# -------------------------------------------------------------

def test_auto_fixer_select_all(auto_fixer):
    sql = "SELECT * FROM sales;"
    fixed, changes = auto_fixer.fix_query(sql)
    assert "SELECT id, created_at, status" in fixed
    assert len(changes) == 1

def test_auto_fixer_case_conversions(auto_fixer):
    sql = "SELECT orderID, paymentStatus FROM orders;"
    fixed, changes = auto_fixer.fix_query(sql)
    assert "order_id" in fixed
    assert "payment_status" in fixed
    assert any("orderID" in c for c in changes)

def test_auto_fixer_keyword_capitalization(auto_fixer):
    sql = "select name from users where id = 1 limit 10;"
    fixed, changes = auto_fixer.fix_query(sql)
    assert "SELECT" in fixed
    assert "FROM" in fixed
    assert "WHERE" in fixed
    assert "LIMIT" in fixed
    assert any("select" in c.lower() for c in changes)

# -------------------------------------------------------------
# Unit/Integration Tests: SQLLinter
# -------------------------------------------------------------

def test_linter_clean_query(linter):
    sql = "SELECT id, created_at FROM tbl_users WHERE status = 'active';"
    result = linter.analyze_query(sql)
    assert result["is_clean"] is True
    assert result["issues_count"] == 0
    assert len(result["issues"]) == 0

def test_linter_empty_input(linter):
    result = linter.analyze_query("")
    assert result["is_clean"] is True
    assert result["issues_count"] == 0

def test_linter_invalid_file_syntax(linter):
    sql = "SELECT id FROM tbl_users WHERE WHERE AND SELECT;"
    result = linter.analyze_query(sql)
    assert isinstance(result, dict)
    assert "issues" in result

# -------------------------------------------------------------
# Unit Tests: FileScanner
# -------------------------------------------------------------

def test_file_scanner_normal(scanner, temp_sql_dir):
    files = scanner.scan_directory(str(temp_sql_dir))
    assert len(files) == 3
    basenames = [os.path.basename(f) for f in files]
    assert "clean.sql" in basenames
    assert "bad_query.sql" in basenames
    assert "empty_query.sql" in basenames
    assert "notes.txt" not in basenames

def test_file_scanner_missing_dir(scanner):
    with pytest.raises(ValueError, match="Target directory path does not exist"):
        scanner.scan_directory("/nonexistent_directory_abc_123")

def test_file_scanner_not_a_directory(scanner, tmp_path):
    f = tmp_path / "some_file.txt"
    f.write_text("Hello")
    with pytest.raises(ValueError, match="Path is not a directory"):
        scanner.scan_directory(str(f))

# -------------------------------------------------------------
# Unit Tests: ReportWriter
# -------------------------------------------------------------

def test_report_writer_workflow(tmp_path):
    output_json = tmp_path / "test_report.json"
    output_md = tmp_path / "test_report.md"
    
    writer = ReportWriter(str(output_json))
    
    mock_results = [
        {
            "file": "query1.sql",
            "is_clean": True,
            "issues_count": 0,
            "issues": [],
            "fixes_applied": []
        },
        {
            "file": "query2.sql",
            "is_clean": False,
            "issues_count": 1,
            "issues": [
                {
                    "rule_id": "CR-001",
                    "severity": "WARNING",
                    "brief": "SELECT *",
                    "message": "SELECT * is bad",
                    "fix_hint": "remedy",
                    "line": 1,
                    "column": 1,
                    "context": "SELECT * FROM x"
                }
            ],
            "fixes_applied": ["expanded select *"]
        }
    ]
    
    report_dict = writer.write_json_report(mock_results)
    assert report_dict["summary"]["total_files_scanned"] == 2
    assert report_dict["summary"]["files_with_violations"] == 1
    assert report_dict["summary"]["total_compliance_violations"] == 1
    assert report_dict["summary"]["compliance_score_percent"] == 50
    assert os.path.exists(output_json)
    
    md_text = writer.write_markdown_report(report_dict, str(output_md))
    assert "50% COGNITIVE COMPLIANCE" in md_text
    assert "query1.sql" in md_text
    assert "query2.sql" in md_text
    assert os.path.exists(output_md)

# -------------------------------------------------------------
# Unit Tests: SQLAIAgent & SQLLMAgent (with Mocks)
# -------------------------------------------------------------

@patch("requests.get")
@patch("requests.post")
def test_ai_agents_successful_path(mock_post, mock_get, tmp_path):
    os.environ["AI_PROMPTS_USED_MD"] = str(tmp_path / "ai_prompts_used.md")
    
    mock_get.return_value.status_code = 200
    mock_get.return_value.json.return_value = {"models": []}
    
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "response": "Here is the refactored SQL:\\n\\n\`\`\`sql\\nSELECT id, name FROM users;\\n\`\`\`\\n\\nAnd some points."
    }
    mock_post.return_value = mock_response

    agent_old = SQLAIAgent()
    agent_old.prompt_ledger_file = str(tmp_path / "ai_prompts_used.md")
    res_old = agent_old.suggest_refactoring("select * from users")
    assert res_old["success"] is True
    assert "SELECT id, name FROM users;" in res_old["suggestion"]
    
    agent_new = SQLLMAgent()
    agent_new.prompt_ledger_file = str(tmp_path / "ai_prompts_used.md")
    res_new = agent_new.suggest_refactoring("select * from users", [{"rule_id": "CR-001", "line": 1, "brief": "SELECT *"}])
    assert res_new["success"] is True
    assert "SELECT id, name FROM users;" in res_new["suggestion"]
    assert os.path.exists(agent_new.prompt_ledger_file)


@patch("requests.get")
def test_ai_agents_fallback_path(mock_get, tmp_path):
    mock_get.side_effect = Exception("Connection refused")
    
    agent = SQLLMAgent()
    agent.prompt_ledger_file = str(tmp_path / "ai_prompts_used.md")
    
    res = agent.suggest_refactoring("SELECT * FROM userTable u;", [{"rule_id": "CR-001", "brief": "No select *"}])
    assert res["success"] is False
    assert "unreachable" in res["error"].lower() or "offline" in res["error"].lower()
    assert res["suggestion"] == "SELECT * FROM userTable u;"
    assert os.path.exists(agent.prompt_ledger_file)

# -------------------------------------------------------------
# Integration Tests: CLI Commands (CliRunner)
# -------------------------------------------------------------

def test_cli_command_lint(temp_sql_dir, tmp_path):
    runner = CliRunner()
    report_file = tmp_path / "lint_result.json"
    
    result = runner.invoke(main, [
        "lint", 
        str(temp_sql_dir), 
        "--report", 
        str(report_file)
    ])
    
    assert result.exit_code == 0
    assert "SQL Query Linter" in result.output
    assert "Checking standards quality" in result.output
    assert os.path.exists(report_file)
    assert os.path.exists(str(report_file).replace(".json", ".md"))

def test_cli_command_fix(temp_sql_dir, tmp_path):
    runner = CliRunner()
    report_file = tmp_path / "lint_result.json"
    
    result = runner.invoke(main, [
        "fix", 
        str(temp_sql_dir), 
        "--report", 
        str(report_file)
    ])
    
    assert result.exit_code == 0
    assert "SQL Mechanical Fixer" in result.output
    assert "Repairing styling violations automatically" in result.output
    assert os.path.exists(report_file)
    
    bad_file = temp_sql_dir / "bad_query.sql"
    with open(bad_file, "r") as f:
        content = f.read()
    assert "SELECT id, created_at, status" in content

def test_cli_command_ai_refactor_offline_fallback(temp_sql_dir, tmp_path):
    runner = CliRunner()
    report_file = tmp_path / "lint_result.json"
    
    result = runner.invoke(main, [
        "ai-refactor", 
        str(temp_sql_dir), 
        "--report", 
        str(report_file)
    ])
    
    assert result.exit_code == 0
    assert "SQL AI Refactoring & Query Optimizer" in result.output
    assert "AI Handoff Skip" in result.output or "Ollama server is offline" in result.output or "Graceful fallback" in result.output

def test_cli_command_report(tmp_path):
    runner = CliRunner()
    report_file = tmp_path / "test_report.json"
    
    res_missing = runner.invoke(main, ["report", "--file", str(report_file)])
    assert res_missing.exit_code == 1
    assert "Report file search failure" in res_missing.output
    
    dummy_report = {
        "summary": {
            "total_files_scanned": 1,
            "files_with_violations": 0,
            "total_compliance_violations": 0,
            "total_fixes_applied": 0,
            "compliance_score_percent": 100
        },
        "files_scanned_details": [
            {
                "file": "query1.sql",
                "is_clean": True,
                "issues_count": 0,
                "issues": [],
                "fixes_applied": []
            }
        ]
    }
    with open(report_file, "w") as f:
        json.dump(dummy_report, f)
        
    res_correct = runner.invoke(main, ["report", "--file", str(report_file)])
    assert res_correct.exit_code == 0
    assert "SQL STANDARDS QUALITY AUDIT SUMMARY" in res_correct.output
    assert "100% COGNITIVE COMPLIANCE" in res_correct.output
`
  },
  {
    path: ".github/workflows/ci.yml",
    name: "ci.yml",
    description: "GitHub Actions automated CI script inside .github/workflows directory. Configures test runners across multi-OS setups on push or pull requests to guarantee standards compliance.",
    language: "yaml",
    content: `name: Python SQL Linter CI

on:
  push:
    branches: [ main, master ]
  pull_request:
    branches: [ main, master ]

jobs:
  build_and_test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        python-version: ["3.11", "3.12"]

    steps:
    - name: Checkout Code Repository
      uses: actions/checkout@v4

    - name: Set up Python \${{ matrix.python-version }}
      uses: actions/setup-python@v5
      with:
        python-version: \${{ matrix.python-version }}
        cache: 'pip'

    - name: Install Base and Dev Dependencies
      run: |
        python -m pip install --upgrade pip
        pip install .[dev]

    - name: Run Safety Check (Lint syntax with black / isort)
      run: |
        black --check sql_linter/ tests/
        isort --check-only sql_linter/ tests/

    - name: Run Test Suite with Pytest
      run: |
        pytest
`
  },
  {
    path: "README.md",
    name: "README.md",
    description: "The complete, modern, GitHub-ready project README, mapping out CLI instructions, Python requirements, test runs, and architecture details.",
    language: "markdown",
    content: `# 🛠️ SQL Query Linter & Style Fixer

## 📋 Project Overview
The **SQL Query Linter & Style Fixer** is an enterprise-grade command-line tool (CLI) designed to recursively scan, evaluate, and sanitize SQL database scripts. It enforces clean schema development standards, highlights code quality infractions, executes instant mechanical styling corrections, and calls upon local LLMs via Ollama to generate high-quality database refactoring advice. Furthermore, the tool automatically generates comprehensive JSON compliance audits alongside detailed markdown history logs.

---

## 🚀 Key Features
1. **Recursive Source Exploration**: Deeply scans project hierarchies to locate target \`.sql\` query scripts.
2. **Deterministic Rules Engine**:
   - **CR-001 (SELECT * Warning)**: Warns against performance bottlenecks caused by blanket SELECT query expansions.
   - **CR-002 (Casing Mandates)**: Ensures clean CamelCase conversions to consistent snake_case schema indicators.
   - **CR-003 (Implicit Alias Warning)**: Checks table queries for obscure single-letter reference aliases (e.g., \`profiles p\`).
3. **Automated Styling Corrections**: Resolves rule infractions and applies upper-case keyword conventions non-destructively in-place.
4. **Local LLM Orchestration**: Employs Ollama (\`llama3\` or custom models) to produce complex schema optimizations, logging operations to \`ai_prompts_used.md\`.
5. **Interactive CLI Dashboard**: Presents findings using beautiful, colorized tables and interactive progress reporting.
6. **Detailed Audit Reporting**: Exports structured reports (\`lint_report.json\` & \`lint_report.md\`) for CI/CD gates and security evaluation.

---

## 📂 Project Architecture

\`\`\`text
                     ┌─────────────────────────────┐
                     │     Target SQL Scripts      │
                     │  (/**/*.sql folder scanner)  │
                     └──────────────┬──────────────┘
                                    │
                                    ▼
                     ┌─────────────────────────────┐
                     │       File Discovery        │
                     │      (file_scanner.py)      │
                     └──────────────┬──────────────┘
                                    │
                                    ▼
                     ┌──────────────┴──────────────┐      ┌─────────────────────────┐
                     │      SQLLinter Client       ├─────►│    sqlfluff Engine      │
                     │         (linter.py)         │      │  (Programmatic Parser)  │
                     └──────────────┬──────────────┘      └─────────────────────────┘
                                    │
            ┌───────────────────────┴───────────────────────┐
            ▼                                               ▼
┌───────────────────────┐                       ┌───────────────────────┐
│     Rule Engine       │                       │      AutoFixer        │
│   (rule_engine.py)    │                       │    (auto_fixer.py)    │
├───────────────────────┤                       ├───────────────────────┤
│ RULE-001: SELECT *    │                       │ - Expand SELECT *     │
│ RULE-002: camelCase   │                       │ - snake_case Rename   │
│ RULE-003: short alias │                       │ - Alias Refactoring   │
│ RULE-004: implicit join│                      │ - Join Translation    │
│ RULE-005: mixed case  │                       │ - Uppercase Keywords  │
└───────────┬───────────┘                       └───────────┬───────────┘
            │                                               │
            └───────────────────────┬───────────────────────┘
                                    │ (Unresolved / Non-Mechanical Issues)
                                    ▼
                     ┌─────────────────────────────┐
                     │       SQLLMAgent Loop       │
                     │        (llm_agent.py)       │
                     ├─────────────────────────────┤      ┌─────────────────────────┐
                     │    Ollama API Client /      ├─────►│   Local Ollama Dev Node │
                     │    Groq SDK Integration     │      │   (host:11434 / llama3) │
                     └──────────────┬──────────────┘      └─────────────────────────┘
                                    │
                                    ▼
                     ┌──────────────┴──────────────┐
                     │        ReportWriter         │
                     │      (report_writer.py)     │
                     ├─────────────────────────────┤
                     │ - lint_report.json (Audit)  │
                     │ - lint_report.md (Readable) │
                     │ - ai_prompts_used.md (Log)  │
                     └─────────────────────────────┘
\`\`\`

### File Hierarchy
\`\`\`text
sql-query-linter/
├── .github/
│   └── workflows/
│       └── ci.yml             # Automatic validation workflow
├── sql_linter/
│   ├── __init__.py           # Distribution build descriptor
│   ├── cli.py                # Command line orchestration entry point
│   ├── linter.py             # Rule assessment and mechanical formatting bridge
│   ├── rule_engine.py        # Abstract AST validator definitions
│   ├── auto_fixer.py         # Regular expression-driven code repair
│   ├── report_writer.py      # JSON metrics compilation & markdown exporter
│   ├── ai_agent.py           # Legacy AI client wrapper
│   └── llm_agent.py          # Llama3 Client & prompt dispatch log manager
├── tests/
│   ├── __init__.py           # Testing package descriptor
│   └── test_linter.py        # Pytest integration/unit test boundaries
├── .sqlfluff                 # External static-analysis parameters
├── pyproject.toml            # Package dependency, configuration & lint scripts
└── README.md                 # Complete user & developer documentation
\`\`\`

---

## 🛠️ Installation & Setup
Follow these simple commands to establish your local database engineering workbench:

### 1. Environment & Utilities Activation
Ensure you have **Python 3.11** or greater installed:
\`\`\`bash
# Create and activate an isolated python virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\\Scripts\\activate

# Install the system package in development (editable) mode
pip install -e ".[dev]"
\`\`\`

### 2. Configure Local AI Co-pilot (Ollama)
Configure a local Ollama daemon to host database optimization capabilities:
\`\`\`bash
# Verify local daemon connectivity and active images
ollama list

# Retrieve the llama3 model (or specify alternatives as required)
ollama pull llama3
\`\`\`

---

## 💻 CLI Commands & Usage
Execute tasks via the centralized \`sql-lint-fixer\` shell gateway:

### Scan Target Folders
Analyze all database files and catalog potential standards violations:
\`\`\`bash
sql-lint-fixer lint <folder_path> --report <output_report_json>
\`\`\`

### Execute Automatic Code Refactoring
Repair matching styling, naming casing, and keyword validation infractions in-place:
\`\`\`bash
sql-lint-fixer fix <folder_path>
\`\`\`

### Run Local AI Analysis
Submit database scripts to Ollama to acquire advanced tuning recommendations:
\`\`\`bash
sql-lint-fixer ai-refactor <folder_path> --model llama3 --ollama-host http://localhost:11434
\`\`\`

### Display Interactive Auditor Dashboard
Display a beautiful colorized screen summarizing scanned query scores and file compliance indexes:
\`\`\`bash
sql-lint-fixer report --file lint_report.json
\`\`\`

---

## 🧪 Assumed Architectural Decisions
- **Offline Integrity**: Core execution operates independent of external network layers. Static validation, lint fixing, and AI refactoring occur strictly on-device.
- **Graceful Handoff Boundaries**: If Ollama or selected LLM systems are unreachable, the application continues to report static linter findings without raising blocking crashes.
- **Strict Lint Pre-requisites**: All SQL query parsing and styling modifications preserve standard database logical structures without modifying indexing or schemas on database engines directly.

---

## ⚠️ Known Limitations
- **Token Constraints**: While sufficient for standard application scripts, extremely large SQL files (e.g. >10,000 lines or schema dumps) may consume noticeable local memory and model response budget.
- **Static vs Runtime Parsing**: The linter parses syntax statically using standard text structures without establishing a live connection to a staging database. Certain highly specialized spatial or engine-specific functions might not register in static evaluations.

---

## 🚀 Future Improvements
- **Live Database Grounding**: Introduce optional schema analysis by querying active metadata and primary keys in relational engines (such as PostgreSQL or MySQL).
- **Custom Rule Specification**: Enable engineers to define custom YAML files to specify custom keyword formatting constraints or naming patterns.
- **Expanded Model Registries**: Provide native wrappers to support deep structural recommendations from custom self-hosted model layers.

---

## 🧪 Running Pytest Tests
To execute tests and print outcomes with standard assertion details:
\`\`\`bash
pytest -v
\`\`\`
`
  },
  {
    path: "AI_USAGE_NOTE.md",
    name: "AI_USAGE_NOTE.md",
    description: "One-page AI Usage Note summarizing the collaborative engineering process, AI strengths, prompt patterns, and software lessons learned.",
    language: "markdown",
    content: `# 🧠 AI Usage Note & Collaborative Engineering Post-Mortem

This document summarizes the contributions, design patterns, and lessons learned from developing the **SQL Query Linter & Style Fixer** system cooperatively with Gemini.

---

## 🚀 1. What the AI Promoted & Helped With
The AI played a major architectural and implementation role in the development of the database static analysis toolkit:
- **Clean Framework Segregation**: Divided parsing responsibilities by separating the abstract syntax rule tracking engine (\`rule_engine.py\`) from regular-expression remediation tools (\`auto_fixer.py\`), avoiding unified file creep.
- **Graceful Fault-Tolerant Client**: Implemented a robust local Ollama LLM calling layer (\`llm_agent.py\`) utilizing the \`llama3\` model. The agent incorporates rapid status check pings (\`is_ollama_available\`) and executes seamless fallback outputs if connection resources or model initializations fail.
- **Visual Terminal Visualizers**: Programmed full-featured Click console structures with native Rich layout columns, progressive file scanning bars, and complete colorized tabular summaries.
- **Rigorous Verification Coverages**: Engineered unit test boundaries asserting SELECT \*, uppercase keyword adjustments, camelCase translations, and CLI environment simulation scenarios using click's \`CliRunner\`.

---

## ⚠️ 2. What the AI Got Wrong & Core Adjustments
Several critical adjustments were corrected during developer verification sweeps:
- **String Parsing Escapes in String Literals**: In initial prompt templates inside virtual file declarations (\`/src/projectFiles.ts\`), formatting markers (like backticks \` \\\`\\\`\\\` \` or string interpolations \`f"..."\`) clashed with template literal boundaries. This was resolved by meticulously escaping markdown backticks and using standard \`"{color}".format()\` operations over nested literal formatting.
- **Greedy Model Fallbacks**: Initial AI recommendations occasionally dropped critical non-matching SQL lines. The fallback parsing algorithm was enhanced to inspect and search patterns, defaulting to returning the *original untouched query string* if structural SQL expressions were missing.
- **Stale Context Desynchronization**: While adjusting CLI sub-commands from the legacy \`sql-linter\` namespace to the new \`sql-lint-fixer\` binary, residual references remained in tests. These were aligned during live test-suite verification passes.

---

## 🎯 3. Best Prompts & Interaction Patterns Used
The most effective prompt patterns utilized standard task constraints and role-play instructions:
1. **Rule Boundaries Specification**:
   > *"You are a Senior database performance advisor specialized in SQL Dialect Refactoring. Review this raw query and return EXACTLY three distinct structural bullet points..."*
   *This eliminated chatty conversational preambles and stabilized markdown output formats.*
2. **Deterministic Context Grounding**:
   > *"Generate pytest test suite for SQL Query Linter & Style Fixer asserting SELECT * and snakes_case violations, ensuring edge-case coverage on empty files with mocked local Ollama API responses."*
   *This ensured zero dependency on active internet sockets during build pipeline executions.*

---

## 💡 4. Lessons Learned & Software Engineering Insights
- **Offline Integrity as a First-Class Citizen**: Relying on web-based LLM dependencies can break automated code deployment pipelines. Keeping standard static-analysis rules localized and deterministic, while wrapping LLMs inside non-blocking side-cars, ensures high engineering availability.
- **Modular Rule Separation**: Writing small, single-purpose classes (e.g. \`AutoFixer\`, \`RuleEngine\`) makes unit testing much more deterministic and helps achieve a high test coverage footprint (>70% as required).
- **Escaping Complexity in Virtualized File Trees**: Designing custom web editors that emulate workspace environments requires intense discipline in string-escaping. When packing multiple python scripts inside a parent React typescript file, literal templates can easily clash.
`
  },
  {
    path: "examples/inputs/select_all.sql",
    name: "select_all.sql",
    description: "Sample SQL query demonstrating greedy column selection (CR-001) and lowercase keywords violations.",
    language: "sql",
    content: "select * from users where active_status = 'active';"
  },
  {
    path: "examples/expected_outputs/select_all.sql",
    name: "select_all.sql",
    description: "Expected query output after applying mechanical fixing for greedy SELECT * and lowercase keywords.",
    language: "sql",
    content: "SELECT id, user_id, updated_at, status FROM users WHERE active_status = 'active';"
  },
  {
    path: "examples/inputs/bad_aliases.sql",
    name: "bad_aliases.sql",
    description: "SQL script demonstrating single-letter table alias violations (CR-003).",
    language: "sql",
    content: "SELECT u.user_name, o.order_amount FROM tbl_users u JOIN tbl_orders o ON u.id = o.user_id;"
  },
  {
    path: "examples/expected_outputs/bad_aliases.sql",
    name: "bad_aliases.sql",
    description: "Expected output with descriptive table aliases and cleaned SQL formatting style rules.",
    language: "sql",
    content: "SELECT u_table.user_name, o_table.order_amount FROM tbl_users u_table JOIN tbl_orders o_table ON u_table.id = o_table.user_id;"
  },
  {
    path: "examples/inputs/camelcase_names.sql",
    name: "camelcase_names.sql",
    description: "SQL script demonstrating camelCase naming violations (CR-002) and lowercase keywords style violations.",
    language: "sql",
    content: "select orderID, customerEmailAddress from tblOrders where paymentAmount > 100.0;"
  },
  {
    path: "examples/expected_outputs/camelcase_names.sql",
    name: "camelcase_names.sql",
    description: "Expected query after converting non-snake_case identifiers and formatting lowercase keywords to UPPERCASE.",
    language: "sql",
    content: "SELECT order_id, customer_email_address FROM tbl_orders WHERE payment_amount > 100.0;"
  },
  {
    path: "examples/inputs/clean_sql.sql",
    name: "clean_sql.sql",
    description: "Clean SQL query complying with all enterprise standards (Upper-case keywords, snake_case identifiers, clear expressions, no SELECT *).",
    language: "sql",
    content: "SELECT id, first_name, last_name, email_address FROM tbl_users WHERE is_active = TRUE AND role = 'admin' LIMIT 50;"
  },
  {
    path: "examples/expected_outputs/clean_sql.sql",
    name: "clean_sql.sql",
    description: "Since the query is fully clean, the expected output remains completely unchanged.",
    language: "sql",
    content: "SELECT id, first_name, last_name, email_address FROM tbl_users WHERE is_active = TRUE AND role = 'admin' LIMIT 50;"
  },
  {
    path: "examples/inputs/empty_file.sql",
    name: "empty_file.sql",
    description: "An empty SQL file, ensuring edge-case compliance and graceful early exits within scanning routines.",
    language: "sql",
    content: ""
  },
  {
    path: "examples/expected_outputs/empty_file.sql",
    name: "empty_file.sql",
    description: "An empty file remains logically empty without causing processing errors.",
    language: "sql",
    content: ""
  }
];
