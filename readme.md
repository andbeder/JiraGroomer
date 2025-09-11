# Business objective
JiraGrommer is inteded to support the data governance team by identifying Jira application support tickets which may have a data impact. Currently it is a manual process to review the Jira backlog, often populated with password reset requests and other administrative items.

## Functional Requirements
 - The app shall be a Node.js application named JiraGroomer.js
 - The app shall read a file called `DGC Report (MCIC Jira).csv` and isolate the columns labeled `Issue key` and `Description`
 - The app shall parse each description and send it to either:
   - A local LLM running on LM Studio at the IPv4 version of localhost (default)
   - GitHub Copilot API when using the `-c` or `--copilot` flag
 - The app shall prompt the LLM to judge if the request encompasses an issue which the data governance council should review
 - The app shall retreive from the LLM a true/false for a data governance flag
 - The app shall retreive from the LLM a reasoning, if applicable, for the data governance flag of true
 - The app shall save the governance == true stories to a new CSV file

## Usage

### Using Local LM Studio (Default)
```bash
node JiraGroomer.js
```

### Using GitHub Copilot API
```bash
node JiraGroomer.js -c
# or
node JiraGroomer.js --copilot
```

## Environment Variables

### For Local LM Studio
- `LM_STUDIO_URL` - URL for LM Studio API (default: `http://127.0.0.1:1234/v1/chat/completions`)
- `LM_STUDIO_MODEL` - Model name for LM Studio (default: `local-model`)

### For GitHub Copilot API
- `COPILOT_API_KEY` - **Required** when using `-c` or `--copilot` flag
- `COPILOT_API_URL` - Copilot API endpoint (default: `https://api.githubcopilot.com/chat/completions`)
- `COPILOT_MODEL` - Model to use with Copilot (default: `gpt-4`)

## Example Setup

### Windows (PowerShell)
```powershell
$env:COPILOT_API_KEY = "your-api-key-here"
node JiraGroomer.js --copilot
```

### Linux/Mac
```bash
export COPILOT_API_KEY="your-api-key-here"
node JiraGroomer.js --copilot
```