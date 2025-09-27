const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Your deployed API URL
const API_BASE_URL = 'https://ai-powered-assignment-scheduler-plumhq.onrender.com';

// Test configuration
const config = {
    timeout: 30000, // 30 seconds timeout for deployed API
    headers: {
        'Content-Type': 'application/json'
    }
};

// Test cases
const testCases = [
    {
        name: 'Text Input - Simple Appointment',
        method: 'POST',
        endpoint: '/api/parse',
        data: {
            text: "I have an appointment with Dr. Smith in Cardiology department on December 15th, 2024 at 3:30 PM"
        }
    },
    {
        name: 'Text Input - Casual Format',
        method: 'POST',
        endpoint: '/api/parse',
        data: {
            text: "Meet with Dentist @ 2pm tomorrow"
        }
    },
    {
        name: 'Text Input - Multiple Departments',
        method: 'POST',
        endpoint: '/api/parse',
        data: {
            text: "Cardiology appointment on Jan 20th 10:30 AM and Neurology checkup on Jan 25th 2:15 PM"
        }
    },
    {
        name: 'Edge Case - Empty Input',
        method: 'POST',
        endpoint: '/api/parse',
        data: {
            text: ""
        }
    },
    {
        name: 'Edge Case - Very Long Text',
        method: 'POST',
        endpoint: '/api/parse',
        data: {
            text: "A".repeat(1500) + " appointment on December 20th at 3pm"
        }
    },
    {
        name: 'Edge Case - No Appointment Info',
        method: 'POST',
        endpoint: '/api/parse',
        data: {
            text: "This is just random text with no appointment information whatsoever"
        }
    }
];

// Color codes for console output
const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    reset: '\x1b[0m',
    bold: '\x1b[1m'
};

// Helper function to make API requests
async function makeRequest(testCase) {
    try {
        const url = `${API_BASE_URL}${testCase.endpoint}`;
        let response;

        if (testCase.method === 'GET') {
            response = await axios.get(url, { timeout: config.timeout });
        } else {
            response = await axios.post(url, testCase.data, { 
                ...config,
                headers: {
                    ...config.headers,
                    'Content-Type': 'application/json'
                }
            });
        }

        return {
            success: true,
            status: response.status,
            data: response.data,
            responseTime: response.headers['x-response-time'] || 'N/A'
        };
    } catch (error) {
        return {
            success: false,
            status: error.response?.status || 'Network Error',
            data: error.response?.data || error.message,
            error: error.message
        };
    }
}

// Helper function to format JSON output
function formatJSON(obj, indent = 2) {
    return JSON.stringify(obj, null, indent);
}

// Helper function to print test results
function printTestResult(testCase, result) {
    console.log(`\n${colors.bold}=== ${testCase.name} ===${colors.reset}`);
    console.log(`${colors.blue}Method:${colors.reset} ${testCase.method} ${testCase.endpoint}`);
    
    if (testCase.data) {
        console.log(`${colors.blue}Request Data:${colors.reset}`);
        console.log(formatJSON(testCase.data));
    }

    if (result.success) {
        console.log(`${colors.green}✓ Status:${colors.reset} ${result.status}`);
        console.log(`${colors.green}✓ Response Time:${colors.reset} ${result.responseTime}`);
        console.log(`${colors.blue}Response:${colors.reset}`);
        console.log(formatJSON(result.data));
    } else {
        console.log(`${colors.red}✗ Status:${colors.reset} ${result.status}`);
        console.log(`${colors.red}✗ Error:${colors.reset} ${result.error}`);
        if (result.data) {
            console.log(`${colors.red}Error Details:${colors.reset}`);
            console.log(formatJSON(result.data));
        }
    }
}

// Main test function
async function runTests() {
    console.log(`${colors.bold}${colors.blue} Testing AI-Powered Appointment Scheduler API${colors.reset}`);
    console.log(`${colors.blue}API URL:${colors.reset} ${API_BASE_URL}`);
    console.log(`${colors.blue}Timestamp:${colors.reset} ${new Date().toISOString()}`);
    
    let passedTests = 0;
    let totalTests = testCases.length;

    for (const testCase of testCases) {
        const result = await makeRequest(testCase);
        printTestResult(testCase, result);
        
        if (result.success) {
            passedTests++;
        }

        // Add delay between requests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Print summary
    console.log(`\n${colors.bold}=== TEST SUMMARY ===${colors.reset}`);
    console.log(`${colors.green}Passed:${colors.reset} ${passedTests}/${totalTests}`);
    console.log(`${colors.red}Failed:${colors.reset} ${totalTests - passedTests}/${totalTests}`);
    
    if (passedTests === totalTests) {
        console.log(`${colors.green}${colors.bold} All tests passed!${colors.reset}`);
    } else {
        console.log(`${colors.yellow}  Some tests failed. Check the output above for details.${colors.reset}`);
    }
}

// Run tests if this file is executed directly
if (require.main === module) {
    runTests().catch(console.error);
}

module.exports = { runTests, makeRequest };
