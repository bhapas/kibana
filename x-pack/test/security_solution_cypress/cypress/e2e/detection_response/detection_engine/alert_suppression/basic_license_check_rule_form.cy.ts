/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  THRESHOLD_ENABLE_SUPPRESSION_CHECKBOX,
  ALERT_SUPPRESSION_DURATION_VALUE_INPUT,
  MACHINE_LEARNING_TYPE,
  ALERT_SUPPRESSION_DURATION_UNIT_INPUT,
  ALERT_SUPPRESSION_FIELDS_INPUT,
  ALERT_SUPPRESSION_FIELDS,
} from '../../../../screens/create_new_rule';

import {
  selectIndicatorMatchType,
  selectNewTermsRuleType,
  selectThresholdRuleType,
  selectEsqlRuleType,
  openSuppressionFieldsTooltipAndCheckLicense,
  selectEqlRuleType,
} from '../../../../tasks/create_new_rule';
import { startBasicLicense } from '../../../../tasks/api_calls/licensing';
import { login } from '../../../../tasks/login';
import { visit } from '../../../../tasks/navigation';
import { CREATE_RULE_URL } from '../../../../urls/navigation';
import { TOOLTIP } from '../../../../screens/common';

import { deleteAlertsAndRules } from '../../../../tasks/api_calls/common';

describe(
  'Alert Suppression basic license check - Rule Form',
  {
    tags: ['@ess'],
  },
  () => {
    beforeEach(() => {
      deleteAlertsAndRules();
      login();
      visit(CREATE_RULE_URL);
      startBasicLicense();
    });

    it('cannot create rule with rule execution suppression on basic license for all rules with enabled suppression', () => {
      // Default query rule
      openSuppressionFieldsTooltipAndCheckLicense();

      selectIndicatorMatchType();
      openSuppressionFieldsTooltipAndCheckLicense();

      selectNewTermsRuleType();
      openSuppressionFieldsTooltipAndCheckLicense();

      selectEsqlRuleType();
      openSuppressionFieldsTooltipAndCheckLicense();

      selectEqlRuleType();
      cy.get(ALERT_SUPPRESSION_FIELDS_INPUT).should('be.disabled');
      cy.get(ALERT_SUPPRESSION_FIELDS).trigger('mouseover');

      // Platinum license is required, tooltip on disabled alert suppression checkbox should tell this
      cy.get(TOOLTIP).contains('Platinum license');

      // ML Rules require Platinum license
      cy.get(MACHINE_LEARNING_TYPE).get('button').should('be.disabled');

      selectThresholdRuleType();
      cy.get(THRESHOLD_ENABLE_SUPPRESSION_CHECKBOX).should('be.disabled');
      cy.get(THRESHOLD_ENABLE_SUPPRESSION_CHECKBOX).parent().trigger('mouseover');
      // Platinum license is required, tooltip on disabled alert suppression checkbox should tell this
      cy.get(TOOLTIP).contains('Platinum license');

      cy.get(ALERT_SUPPRESSION_DURATION_VALUE_INPUT).should('be.disabled');
      cy.get(ALERT_SUPPRESSION_DURATION_UNIT_INPUT).should('be.disabled');
    });
  }
);
