const chrono = require("chrono-node");
const DateTime = require("luxon").DateTime;

// Test the current issue
function testTimeNormalization() {
    console.log("Testing time normalization issue...");
    
    const refDate = DateTime.now().setZone("Asia/Kolkata").toJSDate();
    console.log("Reference date:", refDate);
    
    const testCases = [
        "Meeting with orthopedic doctor tomorrow at 5pm",
        "Book dentist next Friday at 3pm",
        "Appointment at 5:00 PM tomorrow",
        "Meeting at 17:00 tomorrow"
    ];
    
    testCases.forEach((testCase, index) => {
        console.log(`\n--- Test Case ${index + 1}: "${testCase}" ---`);
        
        const results = chrono.parse(testCase, refDate);
        console.log("Chrono results:", results.length);
        
        if (results && results.length > 0) {
            const parsedResult = results[0];
            const parsedDate = parsedResult.start.date();
            
            console.log("Parsed date (JS Date):", parsedDate);
            console.log("Known values:", parsedResult.start.knownValues);
            
            const dt = DateTime.fromJSDate(parsedDate).setZone("Asia/Kolkata");
            console.log("Luxon DateTime:", dt.toString());
            console.log("Formatted time:", dt.toFormat("HH:mm"));
            console.log("ISO string:", dt.toISO());
        }
    });
}

testTimeNormalization();
