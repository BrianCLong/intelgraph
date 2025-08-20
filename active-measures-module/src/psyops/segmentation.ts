/**
 * Audience Segmentation for PsyOps
 * 
 * Implements OCEAN model-based audience segmentation with vulnerability assessment
 * and psychographic profiling for targeted psychological operations.
 */

export interface AudienceSegment {
  id: string;
  name: string;
  demographics: Demographics;
  psychographics: Psychographics;
  oceanTraits: OceanTraits;
  vulnerabilities: Vulnerability[];
  communicationChannels: string[];
  influenceNetwork: InfluenceNetwork;
  riskProfile: RiskProfile;
}

export interface Demographics {
  ageRange: string;
  geography: string;
  education: string;
  income: string;
  occupation: string;
  politicalAffiliation?: string;
}

export interface Psychographics {
  values: string[];
  interests: string[];
  lifestyle: string;
  attitudes: string[];
  motivations: string[];
  fears: string[];
}

export interface OceanTraits {
  openness: number;        // 0-1 scale
  conscientiousness: number;
  extraversion: number;
  agreeableness: number;
  neuroticism: number;
  confidence: number;      // Confidence in trait assessment
}

export interface Vulnerability {
  type: VulnerabilityType;
  severity: number;        // 0-1 scale
  exploitability: number;  // 0-1 scale
  description: string;
  triggers: string[];
  mitigations: string[];
}

export interface InfluenceNetwork {
  keyInfluencers: string[];
  informationSources: string[];
  socialConnections: string[];
  trustNetworks: string[];
}

export interface RiskProfile {
  susceptibilityScore: number;
  resistanceFactors: string[];
  amplificationPotential: number;
  backfireRisk: number;
}

export enum VulnerabilityType {
  COGNITIVE_BIAS = 'cognitive_bias',
  EMOTIONAL_TRIGGER = 'emotional_trigger',
  SOCIAL_PRESSURE = 'social_pressure',
  INFORMATION_GAP = 'information_gap',
  TRUST_DEFICIT = 'trust_deficit',
  ECONOMIC_STRESS = 'economic_stress',
  IDENTITY_INSECURITY = 'identity_insecurity',
  AUTHORITY_DEFERENCE = 'authority_deference'
}

/**
 * Segment audience based on tuning parameters and available data
 */
export function segmentAudience(tuners: any, targetData?: any): AudienceSegment[] {
  const segments: AudienceSegment[] = [];
  
  // Generate primary segments based on vulnerability assessment
  const highSusceptibility = generateHighSusceptibilitySegment(tuners);
  const moderateSusceptibility = generateModerateSusceptibilitySegment(tuners);
  const lowSusceptibility = generateLowSusceptibilitySegment(tuners);
  
  segments.push(highSusceptibility, moderateSusceptibility, lowSusceptibility);
  
  // Add specialized segments based on operation type
  if (tuners?.operationType === 'election_influence') {
    segments.push(generateVoterSegments(tuners));
  }
  
  if (tuners?.operationType === 'economic_influence') {
    segments.push(generateEconomicSegments(tuners));
  }
  
  // Generate segments based on OCEAN traits
  const oceanSegments = generateOceanBasedSegments(tuners);
  segments.push(...oceanSegments);
  
  return segments.flat();
}

/**
 * Generate high susceptibility segment
 */
function generateHighSusceptibilitySegment(tuners: any): AudienceSegment {
  return {
    id: 'high_susceptibility',
    name: 'High Susceptibility Audience',
    demographics: {
      ageRange: '18-35, 55+',
      geography: 'Urban and rural extremes',
      education: 'High school or less, highly specialized',
      income: 'Low or recently declining',
      occupation: 'Service industry, displaced workers',
      politicalAffiliation: 'Strongly partisan'
    },
    psychographics: {
      values: ['Security', 'Tradition', 'Belonging'],
      interests: ['Social media', 'News consumption', 'Community events'],
      lifestyle: 'High social media usage, traditional media consumption',
      attitudes: ['Skeptical of institutions', 'Emotionally driven'],
      motivations: ['Safety', 'Recognition', 'Control'],
      fears: ['Economic insecurity', 'Social change', 'Personal irrelevance']
    },
    oceanTraits: {
      openness: 0.3,
      conscientiousness: 0.4,
      extraversion: 0.6,
      agreeableness: 0.5,
      neuroticism: 0.8,
      confidence: 0.7
    },
    vulnerabilities: [
      {
        type: VulnerabilityType.EMOTIONAL_TRIGGER,
        severity: 0.9,
        exploitability: 0.8,
        description: 'High emotional reactivity to fear-based messaging',
        triggers: ['Threat to family', 'Economic loss', 'Social exclusion'],
        mitigations: ['Fact-checking', 'Emotional regulation techniques']
      },
      {
        type: VulnerabilityType.COGNITIVE_BIAS,
        severity: 0.8,
        exploitability: 0.7,
        description: 'Susceptible to confirmation bias and availability heuristic',
        triggers: ['Information that confirms existing beliefs'],
        mitigations: ['Critical thinking training', 'Diverse information sources']
      }
    ],
    communicationChannels: [
      'Facebook', 'Twitter', 'Local news', 'Community forums', 
      'Text messaging', 'WhatsApp', 'Traditional radio'
    ],
    influenceNetwork: {
      keyInfluencers: ['Local leaders', 'Social media personalities', 'Traditional media'],
      informationSources: ['Social media', 'Local news', 'Word of mouth'],
      socialConnections: ['Family', 'Local community', 'Work colleagues'],
      trustNetworks: ['Close friends', 'Religious leaders', 'Local authorities']
    },
    riskProfile: {
      susceptibilityScore: 0.9,
      resistanceFactors: ['Strong social ties', 'Religious beliefs'],
      amplificationPotential: 0.8,
      backfireRisk: 0.3
    }
  };
}

/**
 * Generate moderate susceptibility segment
 */
function generateModerateSusceptibilitySegment(tuners: any): AudienceSegment {
  return {
    id: 'moderate_susceptibility',
    name: 'Moderate Susceptibility Audience',
    demographics: {
      ageRange: '25-55',
      geography: 'Suburban',
      education: 'College educated',
      income: 'Middle class',
      occupation: 'Professional, technical',
      politicalAffiliation: 'Moderate, independent'
    },
    psychographics: {
      values: ['Fairness', 'Progress', 'Stability'],
      interests: ['Career development', 'Family activities', 'Current events'],
      lifestyle: 'Balanced media consumption, career-focused',
      attitudes: ['Pragmatic', 'Evidence-based', 'Cautiously optimistic'],
      motivations: ['Success', 'Family welfare', 'Personal growth'],
      fears: ['Economic instability', 'Social conflict', 'Health issues']
    },
    oceanTraits: {
      openness: 0.6,
      conscientiousness: 0.7,
      extraversion: 0.5,
      agreeableness: 0.6,
      neuroticism: 0.4,
      confidence: 0.8
    },
    vulnerabilities: [
      {
        type: VulnerabilityType.INFORMATION_GAP,
        severity: 0.6,
        exploitability: 0.5,
        description: 'May lack time to verify complex information',
        triggers: ['Time pressure', 'Complex topics', 'Authoritative sources'],
        mitigations: ['Simplified fact-checking', 'Trusted source verification']
      },
      {
        type: VulnerabilityType.SOCIAL_PRESSURE,
        severity: 0.5,
        exploitability: 0.4,
        description: 'Influenced by professional and social networks',
        triggers: ['Peer pressure', 'Professional reputation concerns'],
        mitigations: ['Independent verification', 'Diverse networks']
      }
    ],
    communicationChannels: [
      'LinkedIn', 'Email newsletters', 'Professional publications',
      'Podcasts', 'YouTube', 'Twitter', 'Instagram'
    ],
    influenceNetwork: {
      keyInfluencers: ['Industry experts', 'Professional leaders', 'Moderate politicians'],
      informationSources: ['Professional media', 'Peer networks', 'Expert analysis'],
      socialConnections: ['Professional networks', 'Community groups', 'Family'],
      trustNetworks: ['Professional associations', 'Educational institutions']
    },
    riskProfile: {
      susceptibilityScore: 0.5,
      resistanceFactors: ['Critical thinking skills', 'Diverse information sources'],
      amplificationPotential: 0.6,
      backfireRisk: 0.5
    }
  };
}

/**
 * Generate low susceptibility segment
 */
function generateLowSusceptibilitySegment(tuners: any): AudienceSegment {
  return {
    id: 'low_susceptibility',
    name: 'Low Susceptibility Audience',
    demographics: {
      ageRange: '30-65',
      geography: 'Urban, educated communities',
      education: 'Advanced degrees',
      income: 'High income',
      occupation: 'Academia, research, analysis',
      politicalAffiliation: 'Evidence-based, varied'
    },
    psychographics: {
      values: ['Truth', 'Critical thinking', 'Evidence-based reasoning'],
      interests: ['Research', 'Analysis', 'Complex topics', 'Debate'],
      lifestyle: 'High information consumption, analytical approach',
      attitudes: ['Skeptical', 'Analytical', 'Open to changing views'],
      motivations: ['Understanding', 'Accuracy', 'Intellectual growth'],
      fears: ['Misinformation', 'Groupthink', 'Intellectual stagnation']
    },
    oceanTraits: {
      openness: 0.9,
      conscientiousness: 0.8,
      extraversion: 0.4,
      agreeableness: 0.5,
      neuroticism: 0.2,
      confidence: 0.9
    },
    vulnerabilities: [
      {
        type: VulnerabilityType.COGNITIVE_BIAS,
        severity: 0.3,
        exploitability: 0.2,
        description: 'May be susceptible to sophisticated intellectual appeals',
        triggers: ['Complex arguments', 'Academic framing', 'Data presentation'],
        mitigations: ['Peer review', 'Multiple source verification']
      }
    ],
    communicationChannels: [
      'Academic journals', 'Research publications', 'Professional conferences',
      'Specialized media', 'Expert forums', 'Policy analysis platforms'
    ],
    influenceNetwork: {
      keyInfluencers: ['Academic experts', 'Research institutions', 'Think tanks'],
      informationSources: ['Peer-reviewed sources', 'Original research', 'Expert analysis'],
      socialConnections: ['Academic networks', 'Professional associations'],
      trustNetworks: ['Scientific institutions', 'Peer review systems']
    },
    riskProfile: {
      susceptibilityScore: 0.2,
      resistanceFactors: ['Critical thinking training', 'Methodological awareness'],
      amplificationPotential: 0.3,
      backfireRisk: 0.8
    }
  };
}

/**
 * Generate OCEAN-based segments
 */
function generateOceanBasedSegments(tuners: any): AudienceSegment[] {
  return [
    {
      id: 'high_neuroticism',
      name: 'High Neuroticism Segment',
      demographics: {
        ageRange: '18-65',
        geography: 'Various',
        education: 'Various',
        income: 'Various',
        occupation: 'Various'
      },
      psychographics: {
        values: ['Security', 'Stability'],
        interests: ['Self-help', 'Wellness', 'Safety'],
        lifestyle: 'Anxiety-focused, risk-averse',
        attitudes: ['Worried', 'Pessimistic'],
        motivations: ['Safety', 'Certainty'],
        fears: ['Uncertainty', 'Failure', 'Rejection']
      },
      oceanTraits: {
        openness: 0.4,
        conscientiousness: 0.5,
        extraversion: 0.3,
        agreeableness: 0.5,
        neuroticism: 0.9,
        confidence: 0.8
      },
      vulnerabilities: [
        {
          type: VulnerabilityType.EMOTIONAL_TRIGGER,
          severity: 0.9,
          exploitability: 0.8,
          description: 'Highly reactive to fear-based messaging',
          triggers: ['Threat messages', 'Uncertainty', 'Negative outcomes'],
          mitigations: ['Emotional support', 'Reassurance', 'Positive framing']
        }
      ],
      communicationChannels: ['Social media', 'Support forums', 'Mental health platforms'],
      influenceNetwork: {
        keyInfluencers: ['Mental health advocates', 'Support group leaders'],
        informationSources: ['Social media', 'Health websites'],
        socialConnections: ['Support networks', 'Online communities'],
        trustNetworks: ['Healthcare providers', 'Support groups']
      },
      riskProfile: {
        susceptibilityScore: 0.8,
        resistanceFactors: ['Professional help', 'Support networks'],
        amplificationPotential: 0.7,
        backfireRisk: 0.4
      }
    }
  ];
}

/**
 * Generate voter-specific segments
 */
function generateVoterSegments(tuners: any): AudienceSegment {
  return {
    id: 'swing_voters',
    name: 'Swing Voters',
    demographics: {
      ageRange: '25-65',
      geography: 'Suburban, competitive districts',
      education: 'High school to college',
      income: 'Middle class',
      occupation: 'Various',
      politicalAffiliation: 'Independent, undecided'
    },
    psychographics: {
      values: ['Pragmatism', 'Results', 'Fairness'],
      interests: ['Local issues', 'Economic concerns', 'Practical solutions'],
      lifestyle: 'Moderate media consumption, locally focused',
      attitudes: ['Pragmatic', 'Issue-focused', 'Skeptical of extremes'],
      motivations: ['Better outcomes', 'Effective governance', 'Local improvement'],
      fears: ['Bad governance', 'Extremism', 'Economic decline']
    },
    oceanTraits: {
      openness: 0.6,
      conscientiousness: 0.6,
      extraversion: 0.5,
      agreeableness: 0.7,
      neuroticism: 0.4,
      confidence: 0.7
    },
    vulnerabilities: [
      {
        type: VulnerabilityType.INFORMATION_GAP,
        severity: 0.7,
        exploitability: 0.6,
        description: 'May lack detailed policy knowledge',
        triggers: ['Complex policy issues', 'Competing claims'],
        mitigations: ['Simplified explanations', 'Fact-checking']
      }
    ],
    communicationChannels: ['Local news', 'Facebook', 'Direct mail', 'Local events'],
    influenceNetwork: {
      keyInfluencers: ['Local leaders', 'Community figures', 'Local media'],
      informationSources: ['Local news', 'Word of mouth', 'Social media'],
      socialConnections: ['Local community', 'Work colleagues', 'Family'],
      trustNetworks: ['Local institutions', 'Community leaders']
    },
    riskProfile: {
      susceptibilityScore: 0.6,
      resistanceFactors: ['Practical focus', 'Local knowledge'],
      amplificationPotential: 0.7,
      backfireRisk: 0.5
    }
  };
}

/**
 * Generate economic-focused segments
 */
function generateEconomicSegments(tuners: any): AudienceSegment {
  return {
    id: 'economic_anxiety',
    name: 'Economic Anxiety Segment',
    demographics: {
      ageRange: '25-55',
      geography: 'Rust belt, declining industries',
      education: 'High school to some college',
      income: 'Lower middle class, declining',
      occupation: 'Manufacturing, service industry',
      politicalAffiliation: 'Economic populist'
    },
    psychographics: {
      values: ['Economic security', 'Fair treatment', 'Hard work'],
      interests: ['Job security', 'Economic opportunity', 'Family welfare'],
      lifestyle: 'Work-focused, financially stressed',
      attitudes: ['Frustrated', 'Distrustful of elites', 'Nostalgic'],
      motivations: ['Economic security', 'Better opportunities', 'Respect'],
      fears: ['Job loss', 'Economic decline', 'Being forgotten']
    },
    oceanTraits: {
      openness: 0.3,
      conscientiousness: 0.7,
      extraversion: 0.4,
      agreeableness: 0.5,
      neuroticism: 0.7,
      confidence: 0.8
    },
    vulnerabilities: [
      {
        type: VulnerabilityType.ECONOMIC_STRESS,
        severity: 0.9,
        exploitability: 0.8,
        description: 'Highly responsive to economic messaging',
        triggers: ['Job threats', 'Economic inequality', 'Trade issues'],
        mitigations: ['Economic education', 'Support programs']
      }
    ],
    communicationChannels: ['Local radio', 'Facebook', 'Union communications'],
    influenceNetwork: {
      keyInfluencers: ['Union leaders', 'Local politicians', 'Economic advocates'],
      informationSources: ['Local media', 'Union communications', 'Word of mouth'],
      socialConnections: ['Work colleagues', 'Union members', 'Local community'],
      trustNetworks: ['Labor organizations', 'Local leaders']
    },
    riskProfile: {
      susceptibilityScore: 0.8,
      resistanceFactors: ['Union solidarity', 'Local knowledge'],
      amplificationPotential: 0.8,
      backfireRisk: 0.3
    }
  };
}

/**
 * Create vulnerability heatmap for visualization
 */
export function createVulnerabilityHeatmap(segments: AudienceSegment[]): VulnerabilityHeatmap {
  const heatmap: VulnerabilityHeatmap = {
    segments: [],
    vulnerabilityTypes: Object.values(VulnerabilityType),
    maxSeverity: 0
  };

  segments.forEach(segment => {
    const segmentData: SegmentHeatmapData = {
      segmentId: segment.id,
      segmentName: segment.name,
      vulnerabilities: []
    };

    Object.values(VulnerabilityType).forEach(vulnType => {
      const vulnerability = segment.vulnerabilities.find(v => v.type === vulnType);
      const severity = vulnerability ? vulnerability.severity : 0;
      const exploitability = vulnerability ? vulnerability.exploitability : 0;
      
      segmentData.vulnerabilities.push({
        type: vulnType,
        severity,
        exploitability,
        combinedScore: severity * exploitability
      });
      
      if (severity > heatmap.maxSeverity) {
        heatmap.maxSeverity = severity;
      }
    });

    heatmap.segments.push(segmentData);
  });

  return heatmap;
}

export interface VulnerabilityHeatmap {
  segments: SegmentHeatmapData[];
  vulnerabilityTypes: VulnerabilityType[];
  maxSeverity: number;
}

export interface SegmentHeatmapData {
  segmentId: string;
  segmentName: string;
  vulnerabilities: Array<{
    type: VulnerabilityType;
    severity: number;
    exploitability: number;
    combinedScore: number;
  }>;
}