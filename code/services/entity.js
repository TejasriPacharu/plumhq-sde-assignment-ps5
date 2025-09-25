const chrono = require("chrono-node");
const departments = require("../config/departments.json");

function findDepartment(text) {
    text = text.toLowerCase();
    for(const [canon, synonyms] of Object.entries(departments)) {
        for(const s of synonyms) {
            const re = new RegExp(`\\b${s}\\b`, "i");
            if(re.test(text)) return canon;
        }
    }
    return null;
}

function extractEntities(rawText, refDate = new Data()) {
    const parsed = chrono.parse(rawText, refDate , {forwardDate: true});
    const date_phrase = parsed[0]?.text;
    
    let time_phrase = null;
    if(parsed[0] && parsed[0].start) {
        time_phrase = parsed[0].text.match(/(\b\d{1,2}(:\d{2})?\s*(am|pm)?\b)/i)?.[0];
    } else {
        time_phrase = rawText.match(/(\b\d{1,2}(:\d{2})?\s*(am|pm)\b)/i)?.[0];
    }

    const department = findDepartment(rawText);

    let score = 0;
    if(date_phrase) score = score + 0.45;
    if(time_phrase) score = score + 0.35;
    if(department) score = score + 0.2;
    
    return {
        entities: {
            date: date_phrase,
            time: time_phrase,
            department: department,
        },
        entities_confidence: Number(score.toFixed(2))
    };
}

module.exports = extractEntities;
