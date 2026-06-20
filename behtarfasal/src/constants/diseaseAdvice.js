const GENERAL_PREVENTION = [
  'Inspect crops every few days and remove badly infected leaves early.',
  'Avoid overhead watering; keep leaves as dry as possible.',
  'Keep good spacing between plants to improve airflow.',
  'Clean tools after working with infected plants.',
  'Rotate crops and remove old infected plant debris after harvest.',
];

const HEALTHY_ADVICE = {
  summary: 'The plant appears healthy from the uploaded leaf image.',
  immediateActions: [
    'Continue regular field monitoring.',
    'Keep irrigation balanced and avoid water stress.',
    'Watch for new spots, yellowing, curling, or mold growth.',
  ],
  treatments: ['No treatment is needed right now. Avoid unnecessary pesticide use.'],
  prevention: GENERAL_PREVENTION,
};

const FUNGAL_LEAF_SPOT_ACTIONS = [
  'Remove infected leaves, especially lower leaves touching soil.',
  'Avoid splashing soil onto leaves during irrigation.',
  'Improve airflow by pruning crowded growth where practical.',
];

const FUNGAL_LEAF_SPOT_TREATMENTS = [
  'Apply a locally recommended protective fungicide if spots continue spreading.',
  'Keep nutrition balanced and avoid excessive nitrogen.',
  'Rotate crops and remove infected plant residue after harvest.',
];

const BACTERIAL_ACTIONS = [
  'Remove infected leaves and avoid handling healthy plants immediately after.',
  'Avoid overhead irrigation and wet handling.',
  'Keep infected plant debris away from the field.',
];

const BACTERIAL_TREATMENTS = [
  'Copper-based products may slow spread when used early and according to label directions.',
  'Use certified disease-free seed or seedlings next season.',
  'Consult a local agriculture expert if symptoms spread across the field.',
];

const VIRUS_ACTIONS = [
  'Remove severely infected plants to reduce spread.',
  'Control whiteflies, aphids, or other insect vectors using local recommendations.',
  'Remove weeds around the field because they can host viruses and insects.',
];

const VIRUS_TREATMENTS = [
  'There is no direct cure for viral infection in the plant.',
  'Use vector control and resistant varieties in future crops.',
  'Do not save seed from infected plants.',
];

const ADVICE_BY_LABEL = {
  'Apple Scab': {
    summary: 'Apple scab is a fungal disease that causes dark scabby spots on leaves and fruit, especially in cool wet weather.',
    immediateActions: [
      'Remove fallen infected leaves and fruit from around trees.',
      'Prune to improve airflow through the canopy.',
      'Avoid overhead watering if possible.',
    ],
    treatments: [
      'Use a locally recommended apple scab fungicide during wet disease-prone periods.',
      'Protect new growth early because prevention works better than late treatment.',
      'Plant resistant apple varieties where available.',
    ],
  },
  'Apple with Black Rot': {
    summary: 'Apple black rot can affect leaves, fruit, and branches, often surviving in dead wood and infected fruit.',
    immediateActions: [
      'Remove mummified fruit and infected pruned branches.',
      'Prune dead or cankered wood during dry weather.',
      'Keep the orchard floor clean of infected debris.',
    ],
    treatments: [
      'Use orchard sanitation first; fungicides help most when used preventively.',
      'Disinfect pruning tools after cutting infected wood.',
      'Avoid tree stress with balanced irrigation and nutrition.',
    ],
  },
  'Cedar Apple Rust': {
    summary: 'Cedar apple rust produces orange spots on apple leaves and spreads from nearby juniper or cedar hosts.',
    immediateActions: [
      'Remove heavily infected leaves where practical.',
      'Check nearby juniper or cedar trees for rust galls.',
      'Improve airflow by pruning dense branches.',
    ],
    treatments: [
      'Use a locally recommended rust fungicide before and during early infection periods.',
      'Remove nearby rust galls on alternate hosts where practical.',
      'Plant rust-resistant apple varieties when available.',
    ],
  },
  'Cherry with Powdery Mildew': {
    summary: 'Cherry powdery mildew appears as white powdery growth and spreads in dense canopies with poor airflow.',
    immediateActions: [
      'Remove badly affected leaves and shoots.',
      'Prune crowded growth to improve airflow.',
      'Avoid excessive nitrogen fertilizer.',
    ],
    treatments: [
      'Use sulfur or another locally recommended powdery mildew treatment.',
      'Spray only in suitable weather and follow label safety instructions.',
      'Protect new leaves if the disease keeps returning.',
    ],
  },
  'Corn (Maize) with Cercospora and Gray Leaf Spot': {
    summary: 'Gray leaf spot causes rectangular leaf lesions and can reduce maize yield when it spreads before grain filling.',
    immediateActions: [
      'Monitor lower leaves for expanding rectangular spots.',
      'Avoid crop stress and maintain balanced nutrition.',
      'Remove or deeply incorporate infected crop residue after harvest.',
    ],
    treatments: [
      'Apply a recommended maize fungicide if lesions increase before grain filling.',
      'Use resistant hybrids in future planting.',
      'Rotate away from maize to reduce residue-borne disease pressure.',
    ],
  },
  'Corn (Maize) with Common Rust': {
    summary: 'Common rust forms orange-brown pustules on maize leaves and spreads by wind-blown spores.',
    immediateActions: [
      'Check nearby maize plants for rust pustules.',
      'Avoid dense planting and moisture stress.',
      'Monitor disease progress during humid weather.',
    ],
    treatments: [
      'Use a locally recommended rust fungicide if infection is active and spreading.',
      'Plant resistant hybrids when available.',
      'Treat early; severe rust is harder to control later.',
    ],
  },
  'Corn (Maize) with Northern Leaf Blight': {
    summary: 'Northern leaf blight creates long gray-green lesions and can seriously reduce maize leaf area.',
    immediateActions: [
      'Monitor long cigar-shaped lesions on lower and middle leaves.',
      'Avoid water stress and keep crop nutrition balanced.',
      'Manage infected residue after harvest.',
    ],
    treatments: [
      'Apply a recommended fungicide if blight appears before or around tasseling.',
      'Use resistant hybrids in future crops.',
      'Rotate crops to reduce pathogen carryover.',
    ],
  },
  'Grape with Black Rot': {
    summary: 'Grape black rot damages leaves and berries and survives in infected fruit mummies and canes.',
    immediateActions: [
      'Remove mummified berries and infected plant debris.',
      'Prune vines to improve sunlight and airflow.',
      'Avoid leaving infected clusters on the vine.',
    ],
    treatments: [
      'Use a recommended grape fungicide early in the season before fruit infection.',
      'Repeat only according to label instructions during wet periods.',
      'Keep vineyards clean after harvest to reduce next season risk.',
    ],
  },
  'Grape with Esca (Black Measles)': {
    summary: 'Esca or black measles is a grapevine trunk disease that can cause striped leaves, berry spotting, and vine decline.',
    immediateActions: [
      'Mark affected vines for pruning inspection.',
      'Remove dead or severely affected wood during dry weather.',
      'Avoid pruning during wet weather when spores spread more easily.',
    ],
    treatments: [
      'There is no simple curative spray for Esca once trunk infection is established.',
      'Use sanitation pruning and protect pruning wounds where locally recommended.',
      'Consult viticulture or agriculture experts for badly affected vines.',
    ],
  },
  'Grape with Isariopsis Leaf Spot': {
    summary: 'Isariopsis leaf spot causes dark angular spots on grape leaves and can weaken vines if severe.',
    immediateActions: [
      'Remove heavily infected leaves where practical.',
      'Improve airflow by pruning dense canopy growth.',
      'Avoid overhead irrigation.',
    ],
    treatments: [
      'Use a locally recommended grape leaf spot fungicide if spotting spreads.',
      'Keep fallen leaves and infected residue out of the vineyard.',
      'Maintain balanced nutrition to support vine recovery.',
    ],
  },
  'Orange with Citrus Greening': {
    summary: 'Citrus greening is a serious disease spread by psyllid insects and can permanently weaken citrus trees.',
    immediateActions: [
      'Contact a local agriculture extension officer for confirmation.',
      'Monitor and control citrus psyllids.',
      'Remove severely affected branches or trees if advised by experts.',
    ],
    treatments: [
      'There is no reliable cure for infected citrus trees.',
      'Use certified healthy nursery plants for new planting.',
      'Manage psyllids and remove infected sources to protect nearby trees.',
    ],
  },
  'Peach with Bacterial Spot': {
    summary: 'Peach bacterial spot causes leaf spots, shot holes, and fruit blemishes, especially in wet windy conditions.',
    immediateActions: BACTERIAL_ACTIONS,
    treatments: BACTERIAL_TREATMENTS,
  },
  'Bell Pepper with Bacterial Spot': {
    summary: 'Bell pepper bacterial spot spreads through infected seed, splashing water, and contaminated tools.',
    immediateActions: BACTERIAL_ACTIONS,
    treatments: BACTERIAL_TREATMENTS,
  },
  'Potato with Early Blight': {
    summary: 'Potato early blight causes brown target-like leaf spots and is worse on stressed or older plants.',
    immediateActions: FUNGAL_LEAF_SPOT_ACTIONS,
    treatments: FUNGAL_LEAF_SPOT_TREATMENTS,
  },
  'Potato with Late Blight': {
    summary: 'Potato late blight is a fast-spreading disease that can damage leaves, stems, and tubers quickly in humid weather.',
    immediateActions: [
      'Remove and destroy heavily infected leaves or plants.',
      'Avoid watering leaves and reduce field humidity where possible.',
      'Do not leave infected potato waste or volunteer plants in the field.',
    ],
    treatments: [
      'Use a locally recommended late blight fungicide as early as possible.',
      'Protect nearby healthy plants because late blight spreads quickly.',
      'Repeat treatment only according to product label or agriculture officer guidance.',
    ],
  },
  'Squash with Powdery Mildew': {
    summary: 'Squash powdery mildew appears as white powdery patches and can reduce leaf function and fruit development.',
    immediateActions: [
      'Remove badly affected leaves without over-pruning the plant.',
      'Increase spacing and airflow around vines.',
      'Avoid excessive nitrogen fertilizer.',
    ],
    treatments: [
      'Use sulfur, potassium bicarbonate, or another locally recommended mildew treatment.',
      'Start treatment early before leaves are heavily covered.',
      'Choose resistant squash varieties where available.',
    ],
  },
  'Strawberry with Leaf Scorch': {
    summary: 'Strawberry leaf scorch causes purple to brown leaf spots and can weaken plants when infection is heavy.',
    immediateActions: FUNGAL_LEAF_SPOT_ACTIONS,
    treatments: [
      'Remove old infected leaves after harvest or when safe for the crop.',
      'Use a locally recommended strawberry leaf spot fungicide if disease spreads.',
      'Keep beds clean and avoid wet leaves for long periods.',
    ],
  },
  'Tomato with Bacterial Spot': {
    summary: 'Tomato bacterial spot spreads through infected seed, splashing water, and wet handling.',
    immediateActions: BACTERIAL_ACTIONS,
    treatments: BACTERIAL_TREATMENTS,
  },
  'Tomato with Early Blight': {
    summary: 'Tomato early blight causes target-like spots, usually starting on lower leaves and spreading upward.',
    immediateActions: FUNGAL_LEAF_SPOT_ACTIONS,
    treatments: FUNGAL_LEAF_SPOT_TREATMENTS,
  },
  'Tomato with Late Blight': {
    summary: 'Tomato late blight spreads quickly in cool humid weather and can damage leaves, stems, and fruit.',
    immediateActions: [
      'Remove and destroy badly infected leaves or plants.',
      'Avoid overhead watering and reduce leaf wetness.',
      'Do not compost infected plant material.',
    ],
    treatments: [
      'Use a locally recommended late blight fungicide as soon as symptoms appear.',
      'Protect nearby healthy tomato plants because the disease spreads quickly.',
      'Follow label intervals and local agriculture officer guidance.',
    ],
  },
  'Tomato with Leaf Mold': {
    summary: 'Tomato leaf mold develops in humid, poorly ventilated conditions and often appears on greenhouse or dense crops.',
    immediateActions: [
      'Increase ventilation and reduce humidity around plants.',
      'Remove infected lower leaves.',
      'Avoid wetting leaves during irrigation.',
    ],
    treatments: [
      'Use a locally recommended fungicide if symptoms keep spreading.',
      'Space plants properly and prune for airflow.',
      'Use resistant tomato varieties in future planting where available.',
    ],
  },
  'Tomato with Septoria Leaf Spot': {
    summary: 'Septoria leaf spot causes many small spots on tomato leaves and can defoliate plants if unmanaged.',
    immediateActions: FUNGAL_LEAF_SPOT_ACTIONS,
    treatments: FUNGAL_LEAF_SPOT_TREATMENTS,
  },
  'Tomato with Spider Mites or Two-spotted Spider Mite': {
    summary: 'Spider mites feed on tomato leaves and increase in hot, dry conditions, causing speckling, yellowing, and webbing.',
    immediateActions: [
      'Spray plants with water to reduce dust and mite pressure where suitable.',
      'Remove heavily infested leaves.',
      'Avoid unnecessary broad-spectrum insecticides that kill beneficial insects.',
    ],
    treatments: [
      'Use a locally recommended miticide if mites are spreading.',
      'Repeat only according to label instructions because mites can build resistance.',
      'Improve irrigation management to reduce plant stress.',
    ],
  },
  'Tomato with Target Spot': {
    summary: 'Tomato target spot causes brown lesions with rings and spreads faster under warm humid conditions.',
    immediateActions: FUNGAL_LEAF_SPOT_ACTIONS,
    treatments: FUNGAL_LEAF_SPOT_TREATMENTS,
  },
  'Tomato Yellow Leaf Curl Virus': {
    summary: 'Tomato yellow leaf curl virus causes curling, yellowing, and stunted growth and is spread mainly by whiteflies.',
    immediateActions: VIRUS_ACTIONS,
    treatments: VIRUS_TREATMENTS,
  },
  'Tomato Mosaic Virus': {
    summary: 'Tomato mosaic virus causes mottled leaves and poor growth and can spread through handling, tools, and infected seed.',
    immediateActions: [
      'Remove severely infected plants.',
      'Wash hands and disinfect tools after touching infected plants.',
      'Avoid tobacco handling near tomato crops because related viruses can spread mechanically.',
    ],
    treatments: VIRUS_TREATMENTS,
  },
};

const getSeverity = (label, confidence) => {
  if (!label || label === 'Unknown') {
    return 'Unknown';
  }
  if (label.toLowerCase().includes('healthy')) {
    return 'Low';
  }
  if (confidence >= 90) {
    return 'High';
  }
  if (confidence >= 75) {
    return 'Medium';
  }
  return 'Low';
};

export const getDiseaseAdvice = (label, confidence = 0) => {
  if (!label || label === 'Unknown') {
    return {
      severity: 'Unknown',
      summary: 'The result is not confident enough for treatment guidance.',
      immediateActions: ['Upload a clearer image of the affected leaf in good light.'],
      treatments: ['Avoid treatment decisions until the disease is confirmed.'],
      prevention: GENERAL_PREVENTION,
    };
  }

  if (label.toLowerCase().includes('healthy')) {
    return {
      severity: getSeverity(label, confidence),
      ...HEALTHY_ADVICE,
    };
  }

  const advice = ADVICE_BY_LABEL[label] || {
    summary: 'This disease may spread if favorable weather and crop conditions continue.',
    immediateActions: [
      'Remove badly infected leaves.',
      'Reduce leaf wetness and improve airflow.',
      'Monitor nearby plants for similar symptoms.',
    ],
    treatments: [
      'Use a locally recommended crop protection product after confirming the disease.',
      'Follow product label instructions and local agriculture officer guidance.',
    ],
  };

  return {
    severity: getSeverity(label, confidence),
    summary: advice.summary,
    immediateActions: advice.immediateActions,
    treatments: advice.treatments,
    prevention: GENERAL_PREVENTION,
  };
};
