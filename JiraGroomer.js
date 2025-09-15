const fs = require('fs');
const csv = require('csv-parser');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const axios = require('axios');

const INPUT_CSV = 'DGC Report (MCIC Jira).csv';
const OUTPUT_CSV = 'governance_flagged_issues.csv';
const CLASSIFICATION_FILE = 'classification.md';

// Parse command line arguments
const args = process.argv.slice(2);
const useCopilot = args.includes('-c') || args.includes('--copilot');

// Parse IP address argument
let lmStudioIp = '127.0.0.1';
const ipIndex = args.findIndex(arg => arg === '-i' || arg === '--ip');
if (ipIndex !== -1 && ipIndex + 1 < args.length) {
    lmStudioIp = args[ipIndex + 1];
}

// Configuration from environment variables
const LM_STUDIO_URL = process.env.LM_STUDIO_URL || `http://${lmStudioIp}:1234/v1/chat/completions`;
const COPILOT_API_URL = process.env.COPILOT_API_URL || 'https://api.githubcopilot.com/chat/completions';
const COPILOT_API_KEY = process.env.COPILOT_API_KEY;
const COPILOT_MODEL = process.env.COPILOT_MODEL || 'gpt-4';

// Load classification criteria
let classificationCriteria = '';
try {
    classificationCriteria = fs.readFileSync(CLASSIFICATION_FILE, 'utf8');
    console.log('✓ Loaded classification criteria from classification.md');
} catch (error) {
    console.warn('⚠ Warning: classification.md not found or unreadable. Using default criteria.');
    classificationCriteria = `
Consider issues related to:
- Data privacy and security
- Data quality or integrity
- Data access control and permissions
- Data compliance and regulatory requirements
- Data architecture and integration
- Master data management
- Data retention and disposal
- Data classification and sensitivity
`;
}

function extractJsonFromResponse(content) {
    // First, try to parse as direct JSON
    try {
        return JSON.parse(content.trim());
    } catch (e) {
        // If that fails, look for JSON in markdown code blocks
        const jsonBlockRegex = /```(?:json)?\s*(\{[\s\S]*?\})\s*```/i;
        const match = content.match(jsonBlockRegex);
        
        if (match) {
            try {
                return JSON.parse(match[1]);
            } catch (parseError) {
                throw new Error(`Invalid JSON in code block: ${parseError.message}`);
            }
        }
        
        // If no code block found, try to find JSON object in the text
        const jsonObjectRegex = /\{[\s\S]*?"governanceFlag"[\s\S]*?\}/;
        const objectMatch = content.match(jsonObjectRegex);
        
        if (objectMatch) {
            try {
                return JSON.parse(objectMatch[0]);
            } catch (parseError) {
                throw new Error(`Invalid JSON object: ${parseError.message}`);
            }
        }
        
        throw new Error('No valid JSON found in response');
    }
}

async function analyzeWithCopilot(description) {
    if (!COPILOT_API_KEY) {
        console.error('Error: COPILOT_API_KEY environment variable not set');
        process.exit(1);
    }

    const prompt = `You are a data governance expert. Analyze the following Jira ticket description and determine if it has data governance implications that the data governance council should review.

## Classification Criteria:
${classificationCriteria}

## Ticket Description:
"${description}"

## Instructions:
Analyze the ticket against the classification criteria provided above. Determine if this ticket requires data governance council review.

Respond in JSON format with exactly these fields:
{
    "governanceFlag": true/false,
    "reasoning": "Brief explanation if flag is true, empty string if false",
    "category": "Most relevant category from: Data Privacy and Security, Data Quality and Integrity, Data Access Control, Compliance and Regulatory, Data Architecture and Integration, Data Lifecycle Management, Data Classification and Sensitivity, Reporting and Analytics, or 'N/A' if no governance impact"
}`;

    try {
        const response = await axios.post(COPILOT_API_URL, {
            model: COPILOT_MODEL,
            messages: [
                {
                    role: 'system',
                    content: 'You are a data governance expert. Analyze tickets and respond with structured JSON.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            temperature: 0.3,
            max_tokens: 200,
            response_format: {
                type: "json_object"
            }
        }, {
            headers: {
                'Authorization': `Bearer ${COPILOT_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        const content = response.data.choices[0].message.content;
        
        try {
            // With structured response, content should be direct JSON
            const parsed = JSON.parse(content);
            return {
                governanceFlag: parsed.governanceFlag || false,
                reasoning: parsed.reasoning || '',
                category: parsed.category || 'N/A'
            };
        } catch (parseError) {
            console.warn('Direct JSON parse failed, attempting fallback parsing...');
            try {
                const parsed = extractJsonFromResponse(content);
                return {
                    governanceFlag: parsed.governanceFlag || false,
                    reasoning: parsed.reasoning || '',
                    category: parsed.category || 'N/A'
                };
            } catch (fallbackError) {
                console.error('Failed to parse Copilot response:', fallbackError.message);
                console.error('Raw response:', content);
                return {
                    governanceFlag: false,
                    reasoning: '',
                    category: 'N/A'
                };
            }
        }
    } catch (error) {
        console.error('Copilot API error:', error.response?.data || error.message);
        return {
            governanceFlag: false,
            reasoning: 'Error: Unable to analyze',
            category: 'N/A'
        };
    }
}

async function analyzeWithLMStudio(description) {
    const prompt = `You are a data governance expert. Analyze the following Jira ticket description and determine if it has data governance implications that the data governance council should review.

## Classification Criteria:
${classificationCriteria}

## Ticket Description:
"${description}"

## Instructions:
Analyze the ticket against the classification criteria provided above. Determine if this ticket requires data governance council review.

Respond in JSON format with exactly these fields:
{
    "governanceFlag": true/false,
    "reasoning": "Brief explanation if flag is true, empty string if false",
    "category": "Most relevant category from: Data Privacy and Security, Data Quality and Integrity, Data Access Control, Compliance and Regulatory, Data Architecture and Integration, Data Lifecycle Management, Data Classification and Sensitivity, Reporting and Analytics, or 'N/A' if no governance impact"
}`;

    try {
        // Build request payload
        const requestPayload = {
            model: process.env.LM_STUDIO_MODEL || 'local-model',
            messages: [
                {
                    role: 'system',
                    content: 'You are a data governance expert. Analyze tickets and respond with structured JSON.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            temperature: 0.3,
            max_tokens: 200
        };
        
        // Add response_format only if LM Studio supports it (configurable via env var)
        if (process.env.LM_STUDIO_STRUCTURED_RESPONSE !== 'false') {
            requestPayload.response_format = {
                type: "json_object"
            };
        }
        
        const response = await axios.post(LM_STUDIO_URL, requestPayload);

        const content = response.data.choices[0].message.content;
        
        try {
            // With structured response, content should be direct JSON
            const parsed = JSON.parse(content);
            return {
                governanceFlag: parsed.governanceFlag || false,
                reasoning: parsed.reasoning || '',
                category: parsed.category || 'N/A'
            };
        } catch (parseError) {
            console.warn('Direct JSON parse failed, attempting fallback parsing...');
            try {
                const parsed = extractJsonFromResponse(content);
                return {
                    governanceFlag: parsed.governanceFlag || false,
                    reasoning: parsed.reasoning || '',
                    category: parsed.category || 'N/A'
                };
            } catch (fallbackError) {
                console.error('Failed to parse LM Studio response:', fallbackError.message);
                console.error('Raw response:', content);
                return {
                    governanceFlag: false,
                    reasoning: '',
                    category: 'N/A'
                };
            }
        }
    } catch (error) {
        console.error('LLM API error:', error.message);
        return {
            governanceFlag: false,
            reasoning: 'Error: Unable to analyze',
            category: 'N/A'
        };
    }
}

async function processJiraTickets() {
    const results = [];
    const governanceFlaggedIssues = [];
    
    console.log(`Reading ${INPUT_CSV}...`);
    
    return new Promise((resolve, reject) => {
        fs.createReadStream(INPUT_CSV)
            .pipe(csv())
            .on('data', (row) => {
                results.push(row);
            })
            .on('end', async () => {
                console.log(`Found ${results.length} tickets to analyze`);
                
                for (let i = 0; i < results.length; i++) {
                    const row = results[i];
                    // Handle BOM character in CSV header
                    const issueKey = row['Issue key'] || row['﻿Issue key'] || row[Object.keys(row)[0]];
                    const description = row['Description'] || '';
                    
                    console.log(`\nAnalyzing ticket ${i + 1}/${results.length}: ${issueKey}`);
                    
                    const analysis = useCopilot ? 
                        await analyzeWithCopilot(description) : 
                        await analyzeWithLMStudio(description);
                    
                    if (analysis.governanceFlag) {
                        console.log(`  ✓ Flagged for governance review`);
                        console.log(`    Category: ${analysis.category}`);
                        console.log(`    Reason: ${analysis.reasoning}`);
                        
                        governanceFlaggedIssues.push({
                            'Issue key': issueKey,
                            'Description': description,
                            'Governance Flag': true,
                            'Category': analysis.category,
                            'Reasoning': analysis.reasoning
                        });
                    } else {
                        console.log(`  - No governance impact detected`);
                    }
                    
                    // Add a small delay to avoid overwhelming the LLM
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
                
                if (governanceFlaggedIssues.length > 0) {
                    const csvWriter = createCsvWriter({
                        path: OUTPUT_CSV,
                        header: [
                            { id: 'Issue key', title: 'Issue key' },
                            { id: 'Description', title: 'Description' },
                            { id: 'Governance Flag', title: 'Governance Flag' },
                            { id: 'Category', title: 'Category' },
                            { id: 'Reasoning', title: 'Reasoning' }
                        ]
                    });
                    
                    await csvWriter.writeRecords(governanceFlaggedIssues);
                    console.log(`\n✓ Saved ${governanceFlaggedIssues.length} governance-flagged issues to ${OUTPUT_CSV}`);
                } else {
                    console.log('\nNo issues flagged for governance review.');
                }
                
                resolve();
            })
            .on('error', (error) => {
                console.error('Error reading CSV:', error);
                reject(error);
            });
    });
}

async function main() {
    console.log('JiraGroomer - Data Governance Ticket Analyzer');
    console.log('=============================================');
    console.log(`Mode: ${useCopilot ? 'GitHub Copilot API' : 'Local LM Studio'}\n`);
    
    if (!fs.existsSync(INPUT_CSV)) {
        console.error(`Error: Input file '${INPUT_CSV}' not found.`);
        console.error('Please ensure the CSV file is in the same directory as this script.');
        process.exit(1);
    }
    
    if (useCopilot) {
        console.log('Checking Copilot API configuration...');
        if (!COPILOT_API_KEY) {
            console.error('Error: COPILOT_API_KEY environment variable not set');
            console.error('Please set the COPILOT_API_KEY environment variable with your API key.');
            process.exit(1);
        }
        console.log('✓ Copilot API configured\n');
    } else {
        console.log('Checking LM Studio connection...');
        try {
            await axios.get(LM_STUDIO_URL.replace('/v1/chat/completions', '/v1/models'));
            console.log('✓ Connected to LM Studio\n');
        } catch (error) {
            console.error(`Error: Cannot connect to LM Studio at ${LM_STUDIO_URL}`);
            console.error('Please ensure LM Studio is running with a model loaded.');
            console.error('Or use -c/--copilot flag to use GitHub Copilot API instead.');
            process.exit(1);
        }
    }
    
    try {
        await processJiraTickets();
        console.log('\n✓ Processing complete!');
    } catch (error) {
        console.error('\nError during processing:', error);
        process.exit(1);
    }
}

main();