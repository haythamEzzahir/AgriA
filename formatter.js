export function formatReportResponse({ reportId, farmData, reportText, model, tokensUsed }) {
  return {
    success: true,
    report: reportText,
    data: {
      report_id: reportId,
      farm_id: farmData.farm_id,
      user_id: farmData.user_id,
      created_at: new Date().toISOString(),
      satellite: farmData.satellite,
      weather: farmData.weather,
      metadata: {
        language: farmData.language || "english",
        crop_type: farmData.crop_type || null,
        location: farmData.location || null,
        llm_model: model,
        tokens_used: tokensUsed || 0,
      },
    },
  };
}
