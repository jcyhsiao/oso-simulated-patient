"""Render the selected record inventory without case-specific trigger decisions."""

def render_catalog(inventory, include_policy=False):
    catalog = "## Diagnostic record inventory\n\n"
    catalog += "Actor-only catalog: apply the general result-release policy; never print this inventory as a menu. Report/component contents remain in the sections below. Equivalent wording is illustrative, not a required keyword list.\n\n"
    if include_policy:
        catalog = catalog.replace("sections below", "assembled case")
    for report in inventory["reports"]:
        if report["owner"] not in {"patient", "facilitator"}:
            raise ValueError("Invalid diagnostic record owner")
        catalog += f"### {report['id']}\n\n"
        catalog += f"- Record: {report['title']}. Owner: {report['owner']}. Date: {report['date']}.\n"
        catalog += f"- Availability/timing: {report['availability']}\n"
        if include_policy:
            permission = 'yes' if report['release_on_firm_plan'] else 'no'
            catalog += f"- Release on firm plan: {permission}. Direct relevant result requests follow the selected release policy.\n"
        if report.get("disclose_on_prior_evaluation"):
            catalog += f"- Prior-assessment discovery: {report['prior_evaluation_context']}\n"
        catalog += "- Equivalent wording/components: " + "; ".join(report["aliases"]) + ".\n\n"
    return catalog
