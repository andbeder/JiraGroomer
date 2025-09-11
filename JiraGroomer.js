const fs = require('fs');
const csv = require('csv-parser');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const axios = require('axios');

const INPUT_CSV = 'DGC Report (MCIC Jira).csv';
const OUTPUT_CSV = 'governance_flagged_issues.csv';
const LM_STUDIO_URL = 'http://127.0.0.1:1234/v1/chat/completions';

async function analyzeWithLLM(description) {
    const prompt = `You are a data governance expert. Analyze the following Jira ticket description and determine if it has data governance implications that the data governance council should review.

Consider issues related to:
- Data privacy and security
- Data quality or integrity
- Data access control and permissions
- Data compliance and regulatory requirements
- Data architecture and integration
- Master data management
- Data retention and disposal
- Data classification and sensitivity

Ticket Description: "${description}"

Respond in JSON format with exactly these fields:
{
    "governanceFlag": true/false,
    "reasoning": "Brief explanation if flag is true, empty string if false"
}`;

    try {
        const response = await axios.post(LM_STUDIO_URL, {
            model: 'local-model',
            messages: [
                {
                    role: 'system',
                    content: 'You are a data governance expert. Respond only with valid JSON.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            temperature: 0.3,
            max_tokens: 200
        });

        const content = response.data.choices[0].message.content;
        
        try {
            const parsed = JSON.parse(content);
            return {
                governanceFlag: parsed.governanceFlag || false,
                reasoning: parsed.reasoning || ''
            };
        } catch (parseError) {
            console.error('Failed to parse LLM response:', content);
            return {
                governanceFlag: false,
                reasoning: ''
            };
        }
    } catch (error) {
        console.error('LLM API error:', error.message);
        return {
            governanceFlag: false,
            reasoning: 'Error: Unable to analyze'
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
                    const issueKey = row['Issue key'];
                    const description = row['Description'] || '';
                    
                    console.log(`\nAnalyzing ticket ${i + 1}/${results.length}: ${issueKey}`);
                    
                    const analysis = await analyzeWithLLM(description);
                    
                    if (analysis.governanceFlag) {
                        console.log(`  ✓ Flagged for governance review`);
                        console.log(`    Reason: ${analysis.reasoning}`);
                        
                        governanceFlaggedIssues.push({
                            'Issue key': issueKey,
                            'Description': description,
                            'Governance Flag': true,
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
    console.log('=============================================\n');
    
    if (!fs.existsSync(INPUT_CSV)) {
        console.error(`Error: Input file '${INPUT_CSV}' not found.`);
        console.error('Please ensure the CSV file is in the same directory as this script.');
        process.exit(1);
    }
    
    console.log('Checking LM Studio connection...');
    try {
        await axios.get('http://127.0.0.1:1234/v1/models');
        console.log('✓ Connected to LM Studio\n');
    } catch (error) {
        console.error('Error: Cannot connect to LM Studio at http://127.0.0.1:1234');
        console.error('Please ensure LM Studio is running with a model loaded.');
        process.exit(1);
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