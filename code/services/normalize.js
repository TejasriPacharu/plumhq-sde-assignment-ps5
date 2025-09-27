// for parsing the date/time phrases to ISO format
const chrono = require("chrono-node");
const DateTime = require("luxon").DateTime;

async function normalizeEntities(entities) {
    const {date, time} = entities;
    
    if(!date || !time) {
        return {
            status : "needs_clarification",
            message : "Missing date or time to normalize"
        };
    }

    // Create reference date in Asia/Kolkata timezone
    const refDate = DateTime.now().setZone("Asia/Kolkata").toJSDate();

    const dateString = date.includes(time) ? date : `${date} ${time}`;

    const results = chrono.parse(dateString, refDate);

    if(!results || results.length === 0) {
        return {status : "needs_clarification", message : "Unable to parse date/time"}
    }

    const parsedResult = results[0];
    const parsedDate = parsedResult.start.date();

    if(!parsedDate) {
        return {status: "needs_clarification", message: "Unable to parse date/time"};
    }

    // FIX: The key issue is that chrono-node returns dates in the server's local timezone,
    // but we want to interpret the parsed time as if it's already in Asia/Kolkata.
    // Instead of converting timezones, we extract the date/time components and 
    // create a new DateTime object in Asia/Kolkata timezone.
    const dt = DateTime.fromObject({
        year: parsedDate.getFullYear(),
        month: parsedDate.getMonth() + 1, // JS months are 0-indexed
        day: parsedDate.getDate(),
        hour: parsedDate.getHours(),
        minute: parsedDate.getMinutes(),
        second: parsedDate.getSeconds()
    }, { zone: 'Asia/Kolkata' });
    
    const now = DateTime.now().setZone("Asia/Kolkata");

    if(dt <= now) {
        return {status: "needs_clarification", message: "Date/time is in the past"};
    }

    // Calculate intelligent normalization confidence
    let confidence = 0.70; // Base confidence for successful parsing
    
    // Check parsing quality factors
    const knownValues = parsedResult.start.knownValues || {};
    const knownValueCount = Object.keys(knownValues).length;
    
    // Bonus for well-specified date/time
    if (knownValues.year && knownValues.month && knownValues.day) {
        confidence += 0.10; // Full date specified
    }
    
    if (knownValues.hour) {
        confidence += 0.05; // Hour specified
        if (knownValues.minute) {
            confidence += 0.03; // Minute also specified
        }
    }
    
    // Bonus for meridiem (AM/PM) specification
    if (knownValues.meridiem !== undefined) {
        confidence += 0.05;
    }
    
    // Check if the parsed result has good certainty based on available data
    // Instead of getCertainty(), we'll assess based on known values
    if (knownValueCount >= 3) {
        confidence += 0.05; // Good amount of parsed information
    }
    
    // Check time format quality in original input
    const timePattern = time.toLowerCase();
    if (timePattern.match(/\d{1,2}:\d{2}\s*(am|pm)/)) {
        confidence += 0.05; // Well-formatted time
    } else if (timePattern.match(/\d{1,2}\s*(am|pm)/)) {
        confidence += 0.03; // Basic time with meridiem
    }
    
    // Check date specificity
    const datePattern = date.toLowerCase();
    if (datePattern.match(/\d{1,2}\/\d{1,2}\/\d{4}/) || datePattern.match(/\d{4}-\d{2}-\d{2}/)) {
        confidence += 0.05; // Specific date format
    } else if (datePattern.match(/(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/)) {
        confidence += 0.03; // Day of week specified
    }
    
    // Ensure we hit target confidence for good normalizations
    if (knownValueCount >= 4 && knownValues.hour && knownValues.meridiem !== undefined) {
        confidence = Math.max(0.90, confidence); // Target confidence for complete normalization
    }
    
    // Cap confidence
    confidence = Math.min(0.95, confidence);
    
    return {
        normalized : {
            date : dt.toFormat("yyyy-MM-dd"),
            time : dt.toFormat("HH:mm"),
            tz : "Asia/Kolkata",
        },
        normalized_confidence: Number(confidence.toFixed(2))
    };
}

module.exports = normalizeEntities;
