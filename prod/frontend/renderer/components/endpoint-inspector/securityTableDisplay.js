export function generateSecurityTable(endpointInfo) {
    if (!endpointInfo.security_data) {
        return `<p class="error-message">No security data available.</p>`;
    }

    const vtData = endpointInfo.security_data.virustotal || {};
    const abuseData = endpointInfo.security_data.abuseipdb || {};

    //extract VirusTotal analysis stats
    const vtStats = vtData.last_analysis_stats || {};
    const analysisResults = vtData.last_analysis_results || {};
    const analysisResultsHTML = Object.entries(analysisResults)
        .map(([engine, result]) => `<tr><td>${engine}</td><td>${result}</td></tr>`)
        .join("");

    return `
        <div class="w-100 flex flex-col g-8">
            <div class="flex flex-row">
                
                <!-- AbuseIPDB Overview -->
                <table class="security-table table">
                    <thead>
                        <tr><th colspan="2">AbuseIPDB Overview</th></tr>
                    </thead>
                    <tbody>
                        <tr><th>Abuse Score</th><td>${abuseData.abuse_score}/100</td></tr>
                        <tr><th>ISP</th><td>${abuseData.isp || "N/A"}</td></tr>
                        <tr><th>Domain</th><td>${abuseData.domain || "N/A"}</td></tr>
                        <tr><th>Usage Type</th><td>${abuseData.usage_type || "N/A"}</td></tr>
                        <tr><th>Country</th><td>${abuseData.country || "N/A"}</td></tr>
                        <tr><th>Total Reports</th><td>${abuseData.total_reports}</td></tr>
                        <tr><th>Last Report</th><td>${abuseData.last_reported_at || "N/A"}</td></tr>
                    </tbody>
                </table>

                <!-- VirusTotal Overview -->
                <table class="security-table table">
                    <thead>
                        <tr><th colspan="2">VirusTotal Overview</th></tr>
                    </thead>
                    <tbody>
                        <tr><th>Reputation</th><td>${vtData.reputation}</td></tr>
                        <tr><th>Country</th><td>${vtData.country}</td></tr>
                        <tr><th>ASN</th><td>${vtData.asn} - ${vtData.as_owner}</td></tr>
                        <tr><th>Malicious</th><td>${vtStats.malicious || 0}</td></tr>
                        <tr><th>Suspicious</th><td>${vtStats.suspicious || 0}</td></tr>
                        <tr><th>Undetected</th><td>${vtStats.undetected || 0}</td></tr>
                        <tr><th>Harmless</th><td>${vtStats.harmless || 0}</td></tr>
                    </tbody>
                </table>

            </div>

            <!-- VirusTotal Analysis Results -->
            <table class="security-table table">
                <thead>
                    <tr><th colspan="2">VirusTotal Analysis Results</th></tr>
                </thead>
                <thead class="vt-results-col-head">
                    <tr>
                        <th>Vendor</th>
                        <th>Rating</th>
                    </tr>
                </thead>
                <tbody class="vt-results">
                    ${analysisResultsHTML}
                </tbody>
            </table>

        </div>
    `;
}
