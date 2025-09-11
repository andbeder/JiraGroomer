const fs = require('fs');
const csv = require('csv-parser');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

const INPUT_CSV = 'DGC Report (MCIC Jira).csv';
const OUTPUT_CSV = 'governance_flagged_issues.csv';

// Mock LLM analysis for testing without LM Studio
function analyzeWithLLM(description) {
    const governanceKeywords = [
        'data', 'database', 'encryption', 'pii', 'gdpr', 'compliance',
        'retention', 'access', 'security', 'privacy', 'audit', 'permission',
        'sensitive', 'confidential', 'regulatory', 'governance', 'deletion',
        'integration', 'master data', 'classification'
    ];
    
    const descLower = description.toLowerCase();
    const hasGovernanceImpact = governanceKeywords.some(keyword => 
        descLower.includes(keyword)
    );
    
    let reasoning = '';
    if (hasGovernanceImpact) {
        if (descLower.includes('pii') || descLower.includes('encryption')) {
            reasoning = 'Data security and privacy concern';
        } else if (descLower.includes('gdpr') || descLower.includes('compliance')) {
            reasoning = 'Regulatory compliance requirement';
        } else if (descLower.includes('retention') || descLower.includes('deletion')) {
            reasoning = 'Data lifecycle management issue';
        } else if (descLower.includes('access') || descLower.includes('permission')) {
            reasoning = 'Data access control consideration';
        } else if (descLower.includes('audit')) {
            reasoning = 'Data audit and monitoring requirement';
        } else {
            reasoning = 'General data governance relevance';
        }
    }
    
    return {
        governanceFlag: hasGovernanceImpact,
        reasoning: reasoning
    };
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
                    
                    const analysis = analyzeWithLLM(description);
                    
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
    console.log('JiraGroomer - Data Governance Ticket Analyzer (Mock Mode)');
    console.log('==========================================================\n');
    
    if (!fs.existsSync(INPUT_CSV)) {
        console.error(`Error: Input file '${INPUT_CSV}' not found.`);
        console.error('Please ensure the CSV file is in the same directory as this script.');
        process.exit(1);
    }
    
    console.log('Using mock LLM analysis (keyword-based) for testing\n');
    
    try {
        await processJiraTickets();
        console.log('\n✓ Processing complete!');
    } catch (error) {
        console.error('\nError during processing:', error);
        process.exit(1);
    }
}

main();