# 🛠️ SQL Query Linter & Style Fixer

## 🌐 Live Application

Access the deployed application here:

**Application URL:**  
https://remix-remix-sql-query-linter-style-fixer-130169087811.asia-southeast1.run.app/
---

## 📋 Overview

**SQL Query Linter & Style Fixer** is an enterprise-grade command-line tool (CLI) that automatically scans, analyzes, and standardizes SQL scripts across projects.

The tool combines deterministic linting rules, automated formatting, and AI-powered refactoring using local Large Language Models (LLMs) through Ollama. It helps development teams maintain consistent SQL coding standards, improve readability, reduce technical debt, and generate compliance reports for auditing purposes.

In addition to SQL style correction, the application produces detailed audit reports and AI recommendation logs that can be integrated into development workflows and CI/CD pipelines.

---

## 🚀 Key Features

### 🔍 Recursive SQL Discovery
- Recursively scans project directories
- Automatically discovers `.sql` files
- Supports large SQL codebases

### ⚙️ Deterministic Rule Engine

#### CR-001 — SELECT * Detection
Detects usage of `SELECT *` and recommends explicit column selection to improve performance and maintainability.

#### CR-002 — Naming Convention Enforcement
Converts inconsistent naming patterns into standardized `snake_case` conventions.

#### CR-003 — Alias Validation
Detects ambiguous aliases and encourages meaningful table references.

#### CR-004 — Implicit Join Detection
Identifies legacy implicit joins and recommends explicit JOIN syntax.

#### CR-005 — SQL Keyword Standardization
Enforces uppercase SQL keywords for improved readability.

### 🔧 Automated Style Fixes
- SQL keyword formatting
- Naming convention correction
- Alias improvements
- Join syntax normalization
- Consistent indentation and formatting

### 🤖 AI-Powered Refactoring
Uses local LLMs through Ollama to:

- Improve query readability
- Suggest performance optimizations
- Recommend structural improvements
- Generate advanced refactoring suggestions
- Provide maintainability recommendations

### 📊 Audit Reporting
Automatically generates:

- `lint_report.json`
- `lint_report.md`
- `ai_prompts_used.md`

### 🖥️ Interactive CLI Dashboard
Provides:

- Colorized terminal output
- Progress indicators
- Compliance summaries
- Rule violation statistics
- Processing metrics

---

## 🏗️ System Architecture

```text
                     ┌─────────────────────────────┐
                     │     Target SQL Scripts      │
                     │  (/**/*.sql folder scanner) │
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
                     │      SQLLinter Client       ├─────►│     SQLFluff Engine     │
                     │         (linter.py)         │      │  (Programmatic Parser)  │
                     └──────────────┬──────────────┘      └─────────────────────────┘
                                    │
            ┌───────────────────────┴───────────────────────┐
            ▼                                               ▼
┌───────────────────────┐                       ┌───────────────────────┐
│      Rule Engine      │                       │      Auto Fixer       │
│    (rule_engine.py)   │                       │    (auto_fixer.py)    │
├───────────────────────┤                       ├───────────────────────┤
│ RULE-001: SELECT *    │                       │ Expand SELECT *       │
│ RULE-002: snake_case  │                       │ snake_case Rename     │
│ RULE-003: Alias Check │                       │ Alias Refactoring     │
│ RULE-004: Join Check  │                       │ Join Translation      │
│ RULE-005: Formatting  │                       │ Keyword Standardize   │
└───────────┬───────────┘                       └───────────┬───────────┘
            │                                               │
            └───────────────────────┬───────────────────────┘
                                    │
                                    ▼
                     ┌─────────────────────────────┐
                     │       SQL LLM Agent         │
                     │       (llm_agent.py)        │
                     ├─────────────────────────────┤
                     │ Ollama / Groq Integration   │
                     │ llama3 / Local Models       │
                     └──────────────┬──────────────┘
                                    │
                                    ▼
                     ┌─────────────────────────────┐
                     │        Report Writer        │
                     │    (report_writer.py)       │
                     ├─────────────────────────────┤
                     │ lint_report.json            │
                     │ lint_report.md              │
                     │ ai_prompts_used.md          │
                     └─────────────────────────────┘
```

# 📂 Project Structure

```text
sql-query-linter/
│
├── .github/
│   └── workflows/
│       └── ci.yml
│
├── sql_linter/
│   ├── __init__.py
│   ├── cli.py
│   ├── linter.py
│   ├── rule_engine.py
│   ├── auto_fixer.py
│   ├── report_writer.py
│   ├── ai_agent.py
│   └── llm_agent.py
│
├── tests/
│   ├── __init__.py
│   └── test_linter.py
│
├── .sqlfluff
├── pyproject.toml
└── README.md
```

---

# 🛠️ Installation

## Prerequisites

- Python 3.11+
- Ollama (optional for AI refactoring)
- Git

### Create a Virtual Environment

```bash
python -m venv .venv
```

### Activate Environment

#### Linux / macOS

```bash
source .venv/bin/activate
```

#### Windows

```bash
.venv\Scripts\activate
```

### Install Dependencies

```bash
pip install -e ".[dev]"
```

---

# 🤖 Configure Ollama

Verify Ollama installation:

```bash
ollama list
```

Download the Llama 3 model:

```bash
ollama pull llama3
```

You may also use other locally available models.

---

# 💻 Usage

## Lint SQL Files

Analyze SQL files and generate a compliance report.

```bash
sql-lint-fixer lint <folder_path> --report lint_report.json
```

### Example

```bash
sql-lint-fixer lint ./sql_scripts --report lint_report.json
```

---

## Apply Automatic Fixes

Automatically fixes supported style violations.

```bash
sql-lint-fixer fix <folder_path>
```

### Example

```bash
sql-lint-fixer fix ./sql_scripts
```

---

## Run AI Refactoring

Generate advanced SQL improvement suggestions using local LLMs.

```bash
sql-lint-fixer ai-refactor <folder_path> \
--model llama3 \
--ollama-host http://localhost:11434
```

### Example

```bash
sql-lint-fixer ai-refactor ./sql_scripts \
--model llama3
```

---

## View Compliance Dashboard

Display a summarized audit report.

```bash
sql-lint-fixer report --file lint_report.json
```

---

# 📄 Generated Reports

| File | Description |
|--------|-------------|
| lint_report.json | Machine-readable audit report |
| lint_report.md | Human-readable compliance summary |
| ai_prompts_used.md | AI interaction and prompt log |

---

# 🧪 Architectural Principles

## Offline-First Design

All linting, formatting, and AI refactoring can run locally without relying on external cloud services.

## Fault-Tolerant Execution

If Ollama is unavailable:

- Linting continues normally
- Reports are still generated
- The application does not crash
- AI steps are gracefully skipped

## Safe Refactoring

The application only modifies SQL formatting and style conventions.

It never:

- Connects to production databases
- Executes SQL queries
- Modifies schemas
- Alters database contents

---

# ⚠️ Known Limitations

## Large SQL Files

Extremely large SQL scripts (>10,000 lines) may increase:

- Memory consumption
- Processing time
- AI response latency

## Static Analysis Only

The tool performs static SQL analysis and does not validate queries against live database schemas.

Certain engine-specific SQL extensions may not be fully recognized.

---

# 🚀 Future Enhancements

## Live Schema Awareness

Support metadata inspection for:

- PostgreSQL
- MySQL
- SQL Server
- Oracle

## Custom Rule Packs

Allow organizations to define custom linting rules through YAML configuration files.

## Expanded Model Support

Support additional local and cloud-hosted LLM providers.

## CI/CD Integration

Provide GitHub Actions and GitLab CI templates for automated SQL quality checks.

## Interactive Web Dashboard

Introduce a browser-based UI for SQL review, compliance monitoring, and AI-assisted refactoring.

---

# 🧪 Running Tests

Execute all tests:

```bash
pytest -v
```

Run code coverage:

```bash
pytest --cov=sql_linter
```

---

# 🛠️ Technology Stack

| Category | Technology |
|-----------|------------|
| Language | Python 3.11+ |
| SQL Parsing | SQLFluff |
| AI Runtime | Ollama |
| AI Models | Llama 3 |
| CLI Framework | Typer / Click |
| Terminal UI | Rich |
| Testing | Pytest |
| CI/CD | GitHub Actions |

---

# 🎯 Project Goal

The goal of this project is to build a reliable AI-assisted SQL quality platform that helps engineering teams maintain clean, consistent, readable, and production-ready SQL code across large-scale database projects.

By combining deterministic linting with AI-powered recommendations, the tool improves developer productivity, reduces code review effort, and promotes long-term SQL maintainability.

---

## 📜 License

This project is intended for educational, research, and enterprise SQL quality automation purposes.

---

**Built with ❤️ for Database Engineers, Data Teams, and Software Developers.**
