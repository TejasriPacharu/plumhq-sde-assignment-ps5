const chrono = require("chrono-node");
const departments = require("../config/departments.json");

function findDepartment(text) {
    const lowerText = text.toLowerCase();
    for (const dept of departments) {
        if (lowerText.includes(dept.name.toLowerCase())) {
            return dept.name;
        }
        for (const synonym of dept.synonyms) {
            if (lowerText.includes(synonym.toLowerCase())) {
                return dept.name;
            }
        }
    }
    return null;
}

function extractEntities(rawText, refDate = new Date()) {
    const parsed = chrono.parse(rawText, refDate , {forwardDate: true});
    const date_phrase = parsed[0]?.text;
    
    let time_phrase = null;
    if(parsed[0] && parsed[0].start) {
        time_phrase = parsed[0].text.match(/(\b\d{1,2}(:\d{2})?\s*(am|pm)?\b)/i)?.[0];
    } else {
        time_phrase = rawText.match(/(\b\d{1,2}(:\d{2})?\s*(am|pm)?\b)/i)?.[0];
    }
    
    // Also try extracting time directly from raw text as fallback
    if (!time_phrase) {
        time_phrase = rawText.match(/(\b\d{1,2}(:\d{2})?\s*(am|pm)?\b)/i)?.[0];
    }
    
    const department = findDepartment(rawText);

    // Calculate intelligent confidence based on extraction quality
    let confidence = 0;
    let entityCount = 0;
    
    // Date confidence (most important for appointments)
    if (date_phrase) {
        entityCount++;
        // Check if date is well-formed
        if (parsed[0] && parsed[0].start && parsed[0].start.knownValues) {
            const knownValues = Object.keys(parsed[0].start.knownValues);
            if (knownValues.length >= 2) { // Has both date and time components
                confidence += 0.40; // High confidence for well-parsed date
            } else {
                confidence += 0.35; // Medium confidence for partial date
            }
        } else {
            confidence += 0.30; // Lower confidence for basic date match
        }
    }
    
    // Time confidence
    if (time_phrase) {
        entityCount++;
        // Check time format quality
        if (time_phrase.match(/\d{1,2}:\d{2}\s*(am|pm)/i)) {
            confidence += 0.30; // High confidence for full time format
        } else if (time_phrase.match(/\d{1,2}\s*(am|pm)/i)) {
            confidence += 0.25; // Medium confidence for hour + am/pm
        } else {
            confidence += 0.20; // Lower confidence for basic time
        }
    }
    
    // Department confidence
    if (department) {
        entityCount++;
        // Check if department was found via exact match vs synonym
        const lowerText = rawText.toLowerCase();
        const exactMatch = departments.find(dept => 
            lowerText.includes(dept.name.toLowerCase())
        );
        
        if (exactMatch) {
            confidence += 0.20; // High confidence for exact department match
        } else {
            confidence += 0.15; // Medium confidence for synonym match
        }
    }
    
    // Bonus for having all three entities (target: 0.85)
    if (entityCount === 3) {
        confidence = Math.min(0.85, confidence + 0.05);
    }
    
    // Ensure minimum confidence if we found at least one entity
    if (entityCount > 0) {
        confidence = Math.max(0.30, confidence);
    }
    
    // Cap maximum confidence
    confidence = Math.min(0.90, confidence);
    
    return {
        entities: {
            date: date_phrase,
            time: time_phrase,
            department: department,
        },
        entities_confidence: Number(confidence.toFixed(2))
    };
}

module.exports = extractEntities;
