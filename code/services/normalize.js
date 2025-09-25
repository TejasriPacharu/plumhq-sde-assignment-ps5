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

    const refDate = DateTime.now().setZone("Asia/Kolkata").toJSDate();

    const dateString = date.includes(time) ? date : `${date} ${time}`;

    const results = chrono.parse(dateString, refDate);

    if(!results) {
        return {status : "needs_clarification", message : "Unable to parse date/time"}
    }

    const parsedResult = results[0];
    const parsedDate = parsedResult.start.date();

    if(!parsedDate) {
        return {status: "needs_clarification", message: "Unable to parse date/time"};
    }

    const dt = DateTime.fromJSDate(parsedDate).setZone("Asia/Kolkata");
    const now = DateTime.now().setZone("Asia/Kolkata");

    if(dt <= now) {
        return {status: "needs_clarification", message: "Date/time is in the past"};
    }
        
    return {
        normalized : {
            date : dt.toFormat("yyyy-MM-dd"),
            time : dt.toFormat("HH:mm"),
            tz : "Asia/Kolkata",
        },
        normalized_confidence: 0.92
    };
}

module.exports = normalizeEntities;
