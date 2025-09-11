# Business objective
JiraGrommer is inteded to support the data governance team by identifying Jira application support tickets which may have a data impact. Currently it is a manual process to review the Jira backlog, often populated with password reset requests and other administrative items.

## Functional Requirements
 - The app shall be a Node.js application named JiraGroomer.js
 - The app shall read a file called `DGC Report (MCIC Jira).csv` and isolate the columns labeled `Issue key` and `Description`
 - The app shall parse each description and send it to a local LLM running on LM Studio at the IPv4 version of localhost
 - The app shall prompt the LLM to judge if the request encompasses an issue which the data governance council should review
 - The app shall retreive from the LLM a true/false for a data governance flag
 - The app shall retreive from the LLM a reasoning, if applicable, for the data governance flag of true
 - The app shall save the governance == true stories to a new CSV file