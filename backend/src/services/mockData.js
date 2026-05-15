function weeksAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n * 7);
  return d.toISOString().split('T')[0];
}

function daysFromNow(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

export const DEMO_FARMS = {
  'demo-001': [
    {
      id: 'farm-demo-001',
      user_id: 'demo-001',
      name: "Ahmed's Wheat Farm",
      size: 'medium',
      custom_area: '3.5',
      crops: ['wheat'],
      irrigation: 'drip',
      water_access: 'good',
      polygon: {
        type: 'Polygon',
        coordinates: [[[-7.6, 33.56], [-7.58, 33.56], [-7.58, 33.58], [-7.6, 33.58], [-7.6, 33.56]]],
      },
      latitude: 33.5731,
      longitude: -7.5898,
      created_at: '2025-01-15T10:00:00Z',
      updated_at: '2025-05-10T08:00:00Z',
    },
  ],
  'demo-002': [
    {
      id: 'farm-demo-002',
      user_id: 'demo-002',
      name: "Fatima's Olive Grove",
      size: 'large',
      custom_area: '8.2',
      crops: ['olives'],
      irrigation: 'drip',
      water_access: 'moderate',
      polygon: {
        type: 'Polygon',
        coordinates: [[[-8.0, 31.62], [-7.97, 31.62], [-7.97, 31.64], [-8.0, 31.64], [-8.0, 31.62]]],
      },
      latitude: 31.6295,
      longitude: -7.9811,
      created_at: '2025-02-01T10:00:00Z',
      updated_at: '2025-05-10T08:00:00Z',
    },
  ],
};

export const DEMO_NDVI = {
  'farm-demo-001': {
    current: { ndvi: 0.62, ndwi: 0.45, soil_moisture: 0.38, temperature: 28.5 },
    history: [
      { date: weeksAgo(12), ndvi: 0.45, ndwi: 0.32, soil_moisture: 0.28, temperature: 18.2 },
      { date: weeksAgo(11), ndvi: 0.48, ndwi: 0.34, soil_moisture: 0.30, temperature: 19.5 },
      { date: weeksAgo(10), ndvi: 0.52, ndwi: 0.37, soil_moisture: 0.32, temperature: 21.0 },
      { date: weeksAgo(9), ndvi: 0.55, ndwi: 0.39, soil_moisture: 0.33, temperature: 22.3 },
      { date: weeksAgo(8), ndvi: 0.58, ndwi: 0.41, soil_moisture: 0.35, temperature: 24.1 },
      { date: weeksAgo(7), ndvi: 0.60, ndwi: 0.43, soil_moisture: 0.36, temperature: 25.8 },
      { date: weeksAgo(6), ndvi: 0.63, ndwi: 0.44, soil_moisture: 0.37, temperature: 26.4 },
      { date: weeksAgo(5), ndvi: 0.65, ndwi: 0.46, soil_moisture: 0.39, temperature: 27.0 },
      { date: weeksAgo(4), ndvi: 0.58, ndwi: 0.40, soil_moisture: 0.34, temperature: 29.8 },
      { date: weeksAgo(3), ndvi: 0.50, ndwi: 0.35, soil_moisture: 0.30, temperature: 31.2 },
      { date: weeksAgo(2), ndvi: 0.55, ndwi: 0.38, soil_moisture: 0.32, temperature: 30.5 },
      { date: weeksAgo(1), ndvi: 0.60, ndwi: 0.42, soil_moisture: 0.36, temperature: 29.0 },
      { date: weeksAgo(0), ndvi: 0.62, ndwi: 0.45, soil_moisture: 0.38, temperature: 28.5 },
    ],
  },
  'farm-demo-002': {
    current: { ndvi: 0.71, ndwi: 0.52, soil_moisture: 0.42, temperature: 32.1 },
    history: [
      { date: weeksAgo(12), ndvi: 0.55, ndwi: 0.40, soil_moisture: 0.33, temperature: 20.0 },
      { date: weeksAgo(11), ndvi: 0.58, ndwi: 0.42, soil_moisture: 0.35, temperature: 21.5 },
      { date: weeksAgo(10), ndvi: 0.61, ndwi: 0.44, soil_moisture: 0.36, temperature: 23.0 },
      { date: weeksAgo(9), ndvi: 0.63, ndwi: 0.45, soil_moisture: 0.37, temperature: 24.8 },
      { date: weeksAgo(8), ndvi: 0.66, ndwi: 0.47, soil_moisture: 0.39, temperature: 26.2 },
      { date: weeksAgo(7), ndvi: 0.68, ndwi: 0.49, soil_moisture: 0.40, temperature: 27.5 },
      { date: weeksAgo(6), ndvi: 0.70, ndwi: 0.50, soil_moisture: 0.41, temperature: 29.0 },
      { date: weeksAgo(5), ndvi: 0.72, ndwi: 0.51, soil_moisture: 0.42, temperature: 30.2 },
      { date: weeksAgo(4), ndvi: 0.74, ndwi: 0.53, soil_moisture: 0.43, temperature: 31.5 },
      { date: weeksAgo(3), ndvi: 0.69, ndwi: 0.48, soil_moisture: 0.39, temperature: 33.0 },
      { date: weeksAgo(2), ndvi: 0.65, ndwi: 0.46, soil_moisture: 0.38, temperature: 35.2 },
      { date: weeksAgo(1), ndvi: 0.68, ndwi: 0.49, soil_moisture: 0.40, temperature: 33.8 },
      { date: weeksAgo(0), ndvi: 0.71, ndwi: 0.52, soil_moisture: 0.42, temperature: 32.1 },
    ],
  },
};

export const DEMO_WEATHER = [
  { date: daysFromNow(0), temp: 28, humidity: 45, rain: 0.05 },
  { date: daysFromNow(1), temp: 26, humidity: 50, rain: 0.20 },
  { date: daysFromNow(2), temp: 24, humidity: 55, rain: 0.35 },
  { date: daysFromNow(3), temp: 25, humidity: 48, rain: 0.10 },
  { date: daysFromNow(4), temp: 27, humidity: 42, rain: 0.0 },
  { date: daysFromNow(5), temp: 29, humidity: 38, rain: 0.0 },
  { date: daysFromNow(6), temp: 30, humidity: 35, rain: 0.0 },
];

export const DEMO_ALERTS = {
  'farm-demo-001': [
    {
      id: 'alert-001-1',
      farm_id: 'farm-demo-001',
      type: 'water_stress',
      severity: 'moderate',
      message: 'Soil moisture dropped to 30%. Consider increasing irrigation frequency.',
      is_read: false,
      created_at: weeksAgo(2) + 'T14:30:00Z',
    },
    {
      id: 'alert-001-2',
      farm_id: 'farm-demo-001',
      type: 'heat_stress',
      severity: 'high',
      message: 'Temperature spike to 31.2°C detected. Crops at risk of heat stress.',
      is_read: false,
      created_at: weeksAgo(3) + 'T12:00:00Z',
    },
    {
      id: 'alert-001-3',
      farm_id: 'farm-demo-001',
      type: 'vegetation_decline',
      severity: 'low',
      message: 'NDVI decreased by 8% compared to last month. Monitor crop health.',
      is_read: true,
      created_at: weeksAgo(4) + 'T09:00:00Z',
    },
    {
      id: 'alert-001-4',
      farm_id: 'farm-demo-001',
      type: 'water_stress',
      severity: 'low',
      message: 'Moderate water stress detected in the northeast section of your farm.',
      is_read: false,
      created_at: weeksAgo(1) + 'T16:45:00Z',
    },
  ],
  'farm-demo-002': [
    {
      id: 'alert-002-1',
      farm_id: 'farm-demo-002',
      type: 'water_stress',
      severity: 'high',
      message: 'Critical water stress detected. Soil moisture at 28% in olive grove.',
      is_read: false,
      created_at: weeksAgo(1) + 'T10:00:00Z',
    },
    {
      id: 'alert-002-2',
      farm_id: 'farm-demo-002',
      type: 'heat_stress',
      severity: 'moderate',
      message: 'High temperatures (35.2°C) may affect olive flowering. Consider cooling measures.',
      is_read: false,
      created_at: weeksAgo(2) + 'T08:30:00Z',
    },
    {
      id: 'alert-002-3',
      farm_id: 'farm-demo-002',
      type: 'vegetation_decline',
      severity: 'moderate',
      message: 'NDVI decline detected in the southern section. Possible pest infestation.',
      is_read: true,
      created_at: weeksAgo(3) + 'T14:00:00Z',
    },
  ],
};

export const DEMO_RECOMMENDATIONS = {
  'farm-demo-001': [
    { name: 'Wheat', match: 92, reason: 'Ideal soil conditions and current season timing. High market demand expected.' },
    { name: 'Corn', match: 78, reason: 'Good water availability via drip irrigation. Suitable for intercropping.' },
    { name: 'Tomatoes', match: 65, reason: 'Moderate suitability. Would require additional soil amendments.' },
    { name: 'Peppers', match: 58, reason: 'Possible but suboptimal. High water requirements may stress resources.' },
  ],
  'farm-demo-002': [
    { name: 'Olives', match: 95, reason: 'Excellent match. Current conditions are optimal for olive cultivation.' },
    { name: 'Argan', match: 82, reason: 'Good suitability for the region. Drought-resistant option.' },
    { name: 'Grapes', match: 70, reason: 'Moderate suitability. Would need trellising infrastructure.' },
    { name: 'Carrots', match: 55, reason: 'Possible but not ideal. Soil type better suited for tree crops.' },
  ],
};

export const DEMO_AI_RESPONSES = {
  'farm-demo-001': {
    greeting: '🌾 Welcome Ahmed! I\'m your AI farming assistant for Ahmed\'s Wheat Farm. Ask me about crop health, irrigation, weather, or anything about your farm!',
    responses: [
      { keywords: ['water', 'irrigation', 'moisture'], response: 'Based on recent satellite data, your soil moisture is at 38%. Your drip irrigation system is performing well, but I recommend increasing watering frequency by 10% during peak heat hours (12:00-16:00). The northwest section of your farm shows slightly lower moisture levels.' },
      { keywords: ['ndvi', 'health', 'crop', 'vegetation'], response: 'Your current NDVI index is 0.62, which indicates good vegetation health. Over the past 12 weeks, we\'ve seen a steady improvement from 0.45 to 0.62, though there was a temporary dip 3 weeks ago due to heat stress. The coefficient of variation is 0.11, showing moderate stability.' },
      { keywords: ['weather', 'forecast', 'rain', 'temperature'], response: 'The 7-day forecast shows temperatures ranging from 24-30°C with low humidity (35-55%). There\'s a 35% chance of rain in 2 days. No extreme weather events expected. I recommend scheduling irrigation for early morning (6-8 AM) to maximize efficiency.' },
      { keywords: ['pest', 'disease', 'problem', 'stress'], response: 'I detected a moderate water stress alert from 2 weeks ago, but conditions have improved since then. The recent temperature spike to 31.2°C 3 weeks ago may have caused minor heat stress. Monitor your crop leaves for signs of wilting, especially in the afternoon hours.' },
    ],
    fallback: 'That\'s a great question about your farm! Based on your Ahmed\'s Wheat Farm data, I recommend monitoring crop health through the NDVI trends on your dashboard. For specific guidance, try asking about irrigation, weather, or crop health.'
  },
  'farm-demo-002': {
    greeting: '🌿 Welcome Fatima! I\'m your AI farming assistant for Fatima\'s Olive Grove. Ask me about your olive trees, irrigation, or anything about farm management!',
    responses: [
      { keywords: ['water', 'irrigation', 'moisture'], response: 'Your olive grove soil moisture is at 42%, which is adequate for mature olive trees. However, the southern section is showing high water stress (critical alert). I recommend targeted deep irrigation in that area. Olive trees are drought-tolerant but perform best with consistent moisture during fruit development.' },
      { keywords: ['ndvi', 'health', 'olive', 'vegetation'], response: 'Your NDVI index is 0.71, indicating very healthy vegetation. The 12-week trend shows strong growth from 0.55 to 0.71, with a minor decline 2 weeks ago during the heatwave (35.2°C). The coefficient of variation is 0.09, demonstrating stable crop development.' },
      { keywords: ['weather', 'forecast', 'rain', 'temperature'], response: 'The forecast shows warm conditions (24-30°C) with low humidity. Your olive trees are well-adapted to these conditions. No significant rain expected. Continue your drip irrigation schedule, focusing on the deep root zone every 5-7 days.' },
      { keywords: ['pest', 'disease', 'olive', 'problem', 'stress'], response: 'I\'ve detected a potential pest issue in the southern section (vegetation decline alert). Monitor for olive fruit fly and peacock spot, common in this region. The NDVI decline of 8% in that area warrants a field inspection. Consider applying organic pest control if confirmed.' },
    ],
    fallback: 'Great question about Fatima\'s Olive Grove! Based on your farm data, everything looks promising. For more specific advice, ask about irrigation, pest management, or check your NDVI trends on the dashboard.'
  },
};

export const DEMO_MARKETPLACE = [
  { id: 'listing-001', user_id: 'demo-001', category: 'crops', title: 'Premium Wheat Harvest', description: 'High-quality wheat from the Casablanca region. Harvested May 2025. Organic farming practices used.', price: 3500.00, photo_url: null, location: 'Casablanca-Settat', users: { name: 'Ahmed Farmer', location: 'Casablanca-Settat' }, created_at: '2025-05-01T10:00:00Z' },
  { id: 'listing-002', user_id: 'demo-002', category: 'crops', title: 'Extra Virgin Olive Oil', description: 'Cold-pressed olive oil from Marrakech. High polyphenol content. Available in 5L and 10L containers.', price: 280.00, photo_url: null, location: 'Marrakech-Safi', users: { name: 'Fatima Grower', location: 'Marrakech-Safi' }, created_at: '2025-04-28T14:30:00Z' },
  { id: 'listing-003', user_id: 'other-001', category: 'equipment', title: 'Drip Irrigation System', description: 'Complete drip irrigation kit covering 2 hectares. Includes pipes, drippers, and timer. Barely used.', price: 4500.00, photo_url: null, location: 'Fès-Meknès', users: { name: 'Hassan Tazi', location: 'Fès-Meknès' }, created_at: '2025-04-20T09:00:00Z' },
  { id: 'listing-004', user_id: 'other-002', category: 'seeds', title: 'Certified Wheat Seeds (2025)', description: 'High-yield wheat variety, certified disease-free. 500kg available. Ideal for the current season.', price: 1200.00, photo_url: null, location: 'Rabat-Salé-Kénitra', users: { name: 'Khadija El Amrani', location: 'Rabat-Salé-Kénitra' }, created_at: '2025-04-15T11:00:00Z' },
  { id: 'listing-005', user_id: 'other-003', category: 'fertilizers', title: 'Organic Compost - 1 Ton', description: 'Rich organic compost made from agricultural waste. Excellent soil amendment for vegetable and tree crops.', price: 800.00, photo_url: null, location: 'Souss-Massa', users: { name: 'Mohamed Idrissi', location: 'Souss-Massa' }, created_at: '2025-04-10T08:00:00Z' },
  { id: 'listing-006', user_id: 'other-004', category: 'services', title: 'Tractor Rental & Plowing', description: 'Professional tractor rental with experienced operator. Available for plowing, harrowing, and seeding. Daily rate.', price: 1500.00, photo_url: null, location: 'Tanger-Tétouan', users: { name: 'Youssef Benali', location: 'Tanger-Tétouan' }, created_at: '2025-04-05T16:00:00Z' },
  { id: 'listing-007', user_id: 'demo-001', category: 'crops', title: 'Fresh Tomatoes', description: 'Locally grown tomatoes, hand-picked. 50kg available weekly. Competitive pricing for bulk orders.', price: 45.00, photo_url: null, location: 'Casablanca-Settat', users: { name: 'Ahmed Farmer', location: 'Casablanca-Settat' }, created_at: '2025-05-05T12:00:00Z' },
  { id: 'listing-008', user_id: 'other-005', category: 'equipment', title: 'Used Water Pump - Submersible', description: 'High-capacity submersible water pump. 5HP, works perfectly. Ideal for well irrigation systems.', price: 3200.00, photo_url: null, location: 'Béni Mellal-Khénifra', users: { name: 'Amina El Fassi', location: 'Béni Mellal-Khénifra' }, created_at: '2025-03-28T10:00:00Z' },
];

export const DEMO_SOIL = {
  'farm-demo-001': {
    soil_moisture: 0.38,
    soil_temperature: 26.0,
    ph: 6.8,
    nitrogen: 42,
    phosphorus: 16,
    potassium: 195,
    organic_matter: 2.4,
    soil_type: 'Clay Loam',
    texture: 'loam',
    drainage: 'moderate',
    depth: 120,
    status: 'healthy',
  },
  'farm-demo-002': {
    soil_moisture: 0.42,
    soil_temperature: 29.6,
    ph: 7.2,
    nitrogen: 34,
    phosphorus: 12,
    potassium: 235,
    organic_matter: 2.0,
    soil_type: 'Silty Clay',
    texture: 'clay',
    drainage: 'slow',
    depth: 100,
    status: 'healthy',
  },
};

export function getDemoFarmId(userId) {
  const farms = DEMO_FARMS[userId];
  return farms?.[0]?.id || null;
}
