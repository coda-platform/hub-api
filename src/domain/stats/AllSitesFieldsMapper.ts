import FieldReponse from "../../models/Response/FieldResponse";
import HubSummarizeResponse from "../../models/Response/HubSummarizeResponse";
import FieldsRequestValueAggregator from "./fieldAggregation/FieldsRequestValueAggregator";

function getSpecificFieldMapped(sameFieldsFromSites: FieldReponse[]): FieldReponse {
    const field = {
        field: sameFieldsFromSites[0].field,
        measure: sameFieldsFromSites[0].measure
    };
    const fieldValues = FieldsRequestValueAggregator.aggregateFieldValues(sameFieldsFromSites);
    return Object.assign(field, ...fieldValues);
}

function getMapped(siteSummarizeReponses: HubSummarizeResponse[]): FieldReponse[] {
    const allSpecificFieldsCombined = new Array<Array<FieldReponse>>();

    const numOfFields = Math.max(...siteSummarizeReponses.map(s=>{
        if(s.results){
            return s.results.length
        }
        else return 0
    }))

    // Group specific fields for all sites in same array group aka invert site responses fields matrix column & rows.
    for (let fieldIndex = 0; fieldIndex < numOfFields; fieldIndex++) {
        const sameFieldForAllSites = new Array<FieldReponse>();

        siteSummarizeReponses.forEach(siteResponses => {
            if(siteResponses.results)
                sameFieldForAllSites.push(siteResponses.results[fieldIndex]);
        });

        allSpecificFieldsCombined.push(sameFieldForAllSites);
    }

    return allSpecificFieldsCombined.map(asfc => getSpecificFieldMapped(asfc));
}

export default {
    getMapped
}