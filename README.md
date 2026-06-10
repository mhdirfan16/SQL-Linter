# 🛠️ SQL Query Linter & Style Fixer

### 📋 Project Overview
  The SQL Query Linter & Style Fixer is an enterprise-grade command-line tool (CLI) designed to recursively scan, evaluate, and sanitize SQL database scripts. It enforces clean schema development standards, highlights code quality infractions, executes instant mechanical styling corrections, and calls upon local LLMs via Ollama to generate high-quality database refactoring advice. Furthermore, the tool automatically generates comprehensive JSON compliance audits alongside detailed markdown history logs.
  ---

### 🚀 Key Features
  Recursive Source Exploration: Deeply scans project hierarchies to locate target `.sql` query scripts.
  Deterministic Rules Engine:
  CR-001 (SELECT * Warning): Warns against performance bottlenecks caused by blanket SELECT query expansions.
  CR-002 (Casing Mandates): Ensures clean CamelCase conversions to consistent snake_case schema indicators.
  CR-003 (Implicit Alias Warning): Checks table queries for obscure single-letter reference aliases (e.g., `profiles p`).
  Automated Styling Corrections: Resolves rule infractions and applies upper-case keyword conventions non-destructively in-place.
  Local LLM Orchestration: Employs Ollama (`llama3` or custom models) to produce complex schema optimizations, logging operations to `ai_prompts_used.md`.
  Interactive CLI Dashboard: Presents findings using beautiful, colorized tables and interactive progress reporting.
  Detailed Audit Reporting: Exports structured reports (`lint_report.json` & `lint_report.md`) for CI/CD gates and security evaluation.
  ---

📂 Project Architecture
```text
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
```

File Hierarchy
```text
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
```
---

🛠️ Installation & Setup
Follow these simple commands to establish your local database engineering workbench:
1. Environment & Utilities Activation
Ensure you have Python 3.11 or greater installed:
```bash
# Create and activate an isolated python virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install the system package in development (editable) mode
pip install -e ".[dev]"
```

2. Configure Local AI Co-pilot (Ollama)
Configure a local Ollama daemon to host database optimization capabilities:
```bash
# Verify local daemon connectivity and active images
ollama list

# Retrieve the llama3 model (or specify alternatives as required)
ollama pull llama3
```
---

### 💻 CLI Commands & Usage
Execute tasks via the centralized `sql-lint-fixer` shell gateway:
Scan Target Folders
Analyze all database files and catalog potential standards violations:
```bash
sql-lint-fixer lint <folder_path> --report <output_report_json>
```
Execute Automatic Code Refactoring
Repair matching styling, naming casing, and keyword validation infractions in-place:
```bash
sql-lint-fixer fix <folder_path>
```
Run Local AI Analysis
Submit database scripts to Ollama to acquire advanced tuning recommendations:
```bash
sql-lint-fixer ai-refactor <folder_path> --model llama3 --ollama-host http://localhost:11434
```
Display Interactive Auditor Dashboard
Display a beautiful colorized screen summarizing scanned query scores and file compliance indexes:
```bash
sql-lint-fixer report --file lint_report.json
```
---

### 🧪 Assumed Architectural Decisions
Offline Integrity: Core execution operates independent of external network layers. Static validation, lint fixing, and AI refactoring occur strictly on-device.
Graceful Handoff Boundaries: If Ollama or selected LLM systems are unreachable, the application continues to report static linter findings without raising blocking crashes.
Strict Lint Pre-requisites: All SQL query parsing and styling modifications preserve standard database logical structures without modifying indexing or schemas on database engines directly.
---

### ⚠️ Known Limitations
Token Constraints: While sufficient for standard application scripts, extremely large SQL files (e.g. >10,000 lines or schema dumps) may consume noticeable local memory and model response budget.
Static vs Runtime Parsing: The linter parses syntax statically using standard text structures without establishing a live connection to a staging database. Certain highly specialized spatial or engine-specific functions might not register in static evaluations.
---

### 🚀 Future Improvements
Live Database Grounding: Introduce optional schema analysis by querying active metadata and primary keys in relational engines (such as PostgreSQL or MySQL).
Custom Rule Specification: Enable engineers to define custom YAML files to specify custom keyword formatting constraints or naming patterns.
Expanded Model Registries: Provide native wrappers to support deep structural recommendations from custom self-hosted model layers.
---
🧪 Running Pytest Tests
To execute tests and print outcomes with standard assertion details:
```bash
pytest -v
```
