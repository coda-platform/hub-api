import FieldResponse from "./FieldResponse";
import SiteStatsBreakdownResponse from "./SiteStatsBreakdownResponse";

export default interface HubStatsCompileResponse {
    siteCode: string;
    job: string;
    total: number;
    query?: string;
    results?: FieldResponse[];
    breakdown?: SiteStatsBreakdownResponse;
    error?: string;
}