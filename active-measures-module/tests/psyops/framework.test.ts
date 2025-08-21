import { 
  generatePlaybook, 
  validateOperation,
  PsyOpsFramework,
  DecisionMatrix,
  ValidationResult
} from '../../src/psyops/framework';

describe('PsyOps Framework', () => {
  describe('generatePlaybook', () => {
    it('should generate a complete PsyOps framework with default parameters', () => {
      const tuners = {
        psyopsIntensity: 0.5,
        doctrineAlignment: 'joint'
      };

      const playbook = generatePlaybook(tuners);

      expect(playbook).toBeDefined();
      expect(playbook.strategic).toBeDefined();
      expect(playbook.operational).toBeDefined();
      expect(playbook.tactical).toBeDefined();
      expect(playbook.decisionMatrix).toBeDefined();
    });

    it('should generate appropriate objectives based on intensity level', () => {
      const lowIntensityTuners = {
        psyopsIntensity: 0.3,
        doctrineAlignment: 'joint'
      };

      const highIntensityTuners = {
        psyopsIntensity: 0.8,
        doctrineAlignment: 'joint'
      };

      const lowIntensityPlaybook = generatePlaybook(lowIntensityTuners);
      const highIntensityPlaybook = generatePlaybook(highIntensityTuners);

      expect(lowIntensityPlaybook.strategic.objectives.length).toBeGreaterThanOrEqual(4);
      expect(highIntensityPlaybook.strategic.objectives.length).toBeGreaterThan(
        lowIntensityPlaybook.strategic.objectives.length
      );
    });

    it('should adapt narrative themes based on doctrine alignment', () => {
      const threeWarfaresTuners = {
        psyopsIntensity: 0.5,
        doctrineAlignment: 'ThreeWarfares'
      };

      const gerasimovTuners = {
        psyopsIntensity: 0.5,
        doctrineAlignment: 'Gerasimov'
      };

      const threeWarfaresPlaybook = generatePlaybook(threeWarfaresTuners);
      const gerasimovPlaybook = generatePlaybook(gerasimovTuners);

      expect(threeWarfaresPlaybook.strategic.narrativeThemes).toContain('Legal legitimacy');
      expect(gerasimovPlaybook.strategic.narrativeThemes).toContain('Non-linear conflict dynamics');
    });

    it('should generate campaigns with appropriate duration and methods', () => {
      const tuners = {
        psyopsIntensity: 0.7,
        doctrineAlignment: 'joint'
      };

      const playbook = generatePlaybook(tuners);

      expect(playbook.operational.campaigns).toBeDefined();
      expect(playbook.operational.campaigns.length).toBeGreaterThan(0);

      playbook.operational.campaigns.forEach(campaign => {
        expect(campaign.duration).toBeGreaterThan(0);
        expect(campaign.methods.length).toBeGreaterThan(0);
        expect(campaign.targetSegments.length).toBeGreaterThan(0);
      });
    });

    it('should include more advanced techniques for high intensity operations', () => {
      const highIntensityTuners = {
        psyopsIntensity: 0.9,
        doctrineAlignment: 'joint'
      };

      const playbook = generatePlaybook(highIntensityTuners);

      const advancedTechniques = playbook.tactical.techniques.filter(
        technique => technique.name.includes('Behavioral') || technique.name.includes('Adaptive')
      );

      expect(advancedTechniques.length).toBeGreaterThan(0);
    });

    it('should generate decision matrix with risk and effectiveness scores', () => {
      const tuners = {
        psyopsIntensity: 0.6,
        doctrineAlignment: 'joint'
      };

      const playbook = generatePlaybook(tuners);

      expect(playbook.decisionMatrix.length).toBeGreaterThan(0);

      playbook.decisionMatrix.forEach(decision => {
        expect(decision.riskLevel).toBeGreaterThanOrEqual(0);
        expect(decision.riskLevel).toBeLessThanOrEqual(1);
        expect(decision.effectivenessScore).toBeGreaterThanOrEqual(0);
        expect(decision.effectivenessScore).toBeLessThanOrEqual(1);
        expect(decision.prerequisites.length).toBeGreaterThan(0);
      });
    });
  });

  describe('validateOperation', () => {
    it('should validate a compliant operation', () => {
      const operation = {
        intensity: 0.5,
        targetProfile: { civilians: false },
        techniques: [
          { attribution: 0.2 },
          { attribution: 0.3 }
        ],
        duration: 30
      };

      const constraints = {
        ethicalIndex: 0.8,
        legalCompliance: 0.9,
        resourceConstraints: { maxBudget: 1000000 }
      };

      const result = validateOperation(operation, constraints);

      expect(result.valid).toBe(true);
      expect(result.issues.length).toBe(0);
    });

    it('should flag high-intensity operations with low ethical constraints', () => {
      const operation = {
        intensity: 0.9,
        targetProfile: { civilians: false },
        techniques: [{ attribution: 0.2 }],
        duration: 30
      };

      const constraints = {
        ethicalIndex: 0.5,
        legalCompliance: 0.9,
        resourceConstraints: { maxBudget: 1000000 }
      };

      const result = validateOperation(operation, constraints);

      expect(result.valid).toBe(false);
      expect(result.issues).toContain('High-intensity operation with low ethical constraints');
    });

    it('should flag civilian targeting with low legal compliance', () => {
      const operation = {
        intensity: 0.5,
        targetProfile: { civilians: true },
        techniques: [{ attribution: 0.2 }],
        duration: 30
      };

      const constraints = {
        ethicalIndex: 0.8,
        legalCompliance: 0.6,
        resourceConstraints: { maxBudget: 1000000 }
      };

      const result = validateOperation(operation, constraints);

      expect(result.valid).toBe(false);
      expect(result.issues).toContain('Civilian targeting requires high legal compliance');
    });

    it('should warn about high attribution techniques when unattributability is required', () => {
      const operation = {
        intensity: 0.5,
        unattributabilityRequirement: 0.9,
        targetProfile: { civilians: false },
        techniques: [
          { attribution: 0.6 },
          { attribution: 0.7 }
        ],
        duration: 30
      };

      const constraints = {
        ethicalIndex: 0.8,
        legalCompliance: 0.9,
        resourceConstraints: { maxBudget: 1000000 }
      };

      const result = validateOperation(operation, constraints);

      expect(result.warnings).toContain(
        'High attribution techniques may compromise unattributability requirement'
      );
    });

    it('should flag operations exceeding budget constraints', () => {
      const operation = {
        intensity: 0.8, // High intensity = higher cost
        targetProfile: { civilians: false },
        techniques: [{ attribution: 0.2 }],
        duration: 90 // Long duration = higher cost
      };

      const constraints = {
        ethicalIndex: 0.8,
        legalCompliance: 0.9,
        resourceConstraints: { maxBudget: 50000 } // Very low budget
      };

      const result = validateOperation(operation, constraints);

      expect(result.valid).toBe(false);
      expect(result.issues).toContain('Operation cost exceeds budget constraints');
    });

    it('should calculate risk assessment correctly', () => {
      const operation = {
        intensity: 0.7,
        targetProfile: { civilians: false },
        techniques: [
          { attribution: 0.5 },
          { attribution: 0.6 }
        ],
        duration: 30
      };

      const constraints = {
        ethicalIndex: 0.8,
        legalCompliance: 0.9,
        resourceConstraints: { maxBudget: 1000000 }
      };

      const result = validateOperation(operation, constraints);

      expect(result.riskAssessment).toBeDefined();
      expect(result.riskAssessment.overallRisk).toBeDefined();
      expect(result.riskAssessment.categories.length).toBeGreaterThan(0);

      result.riskAssessment.categories.forEach(category => {
        expect(category.probability).toBeGreaterThanOrEqual(0);
        expect(category.probability).toBeLessThanOrEqual(1);
        expect(category.impact).toBeGreaterThanOrEqual(0);
        expect(category.impact).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('Decision Matrix Generation', () => {
    it('should include escalated methods for high-intensity operations', () => {
      const highIntensityTuners = {
        psyopsIntensity: 0.8,
        doctrineAlignment: 'joint'
      };

      const playbook = generatePlaybook(highIntensityTuners);

      const escalatedMethods = playbook.decisionMatrix.filter(
        decision => decision.method.includes('Advanced') || decision.riskLevel > 0.7
      );

      expect(escalatedMethods.length).toBeGreaterThan(0);
    });

    it('should provide implementation guidance for each method', () => {
      const tuners = {
        psyopsIntensity: 0.6,
        doctrineAlignment: 'joint'
      };

      const playbook = generatePlaybook(tuners);

      playbook.decisionMatrix.forEach(decision => {
        expect(decision.howToImplement).toBeDefined();
        expect(decision.howToImplement.length).toBeGreaterThan(10);
        expect(decision.whenToUse).toBeDefined();
        expect(decision.whenToUse.length).toBeGreaterThan(5);
      });
    });
  });

  describe('Resource Allocation', () => {
    it('should allocate resources proportionally based on constraints', () => {
      const tuners = {
        psyopsIntensity: 0.6,
        resourceConstraints: {
          maxBudget: 2000000,
          maxPersonnel: 100
        }
      };

      const playbook = generatePlaybook(tuners);

      expect(playbook.operational.resourceAllocation).toBeDefined();
      expect(playbook.operational.resourceAllocation.humanResources).toBeLessThanOrEqual(100);
      expect(playbook.operational.resourceAllocation.budgetDistribution.content +
             playbook.operational.resourceAllocation.budgetDistribution.technology +
             playbook.operational.resourceAllocation.budgetDistribution.personnel +
             playbook.operational.resourceAllocation.budgetDistribution.analytics)
             .toBeLessThanOrEqual(2000000);
    });
  });

  describe('Timing Considerations', () => {
    it('should include appropriate timing considerations', () => {
      const tuners = {
        psyopsIntensity: 0.7,
        doctrineAlignment: 'joint'
      };

      const playbook = generatePlaybook(tuners);

      expect(playbook.operational.timingConsiderations).toContain('News cycle synchronization');
      expect(playbook.operational.timingConsiderations).toContain('Cultural event alignment');
      expect(playbook.operational.timingConsiderations.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Technique Effectiveness', () => {
    it('should assign realistic effectiveness scores to techniques', () => {
      const tuners = {
        psyopsIntensity: 0.6,
        doctrineAlignment: 'joint'
      };

      const playbook = generatePlaybook(tuners);

      playbook.tactical.techniques.forEach(technique => {
        expect(technique.effectiveness).toBeGreaterThan(0);
        expect(technique.effectiveness).toBeLessThanOrEqual(1);
        expect(technique.attribution).toBeGreaterThanOrEqual(0);
        expect(technique.attribution).toBeLessThanOrEqual(1);
        
        // Higher effectiveness techniques should generally have higher attribution risk
        if (technique.effectiveness > 0.8) {
          expect(technique.attribution).toBeGreaterThan(0.2);
        }
      });
    });
  });
});