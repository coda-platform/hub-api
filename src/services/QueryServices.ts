import Selector from "../models/Request/selector";

function nestedSelectorsQuery(selectors: Selector[]) {

    if (!selectors) selectors = []
    if (selectors.find(({ resource }) => resource = "Encounter") && selectors.find(({ resource }) => resource = "Location")) {
        const encounterIndex = selectors.findIndex(({ resource }) => resource = "Encounter");
        const locationIndex = selectors.findIndex(({ resource }) => resource = "Location");

        //move encounter_location to end of array
        selectors.push(selectors.splice(encounterIndex, 1)[0]);
        selectors.push(selectors.splice(locationIndex, 1)[0]);
    }

    var nestedSelectors = [recursiveNesting(selectors)];
    return nestedSelectors;
}

function recursiveNesting(selectors: Selector[]) {
    if (selectors.length == 0) {
        return
    }
    if (selectors.length > 1) {
        selectors[0].joins = recursiveNesting(selectors.slice(1))
    }

    return selectors[0];
}

export default {
    nestedSelectorsQuery
}