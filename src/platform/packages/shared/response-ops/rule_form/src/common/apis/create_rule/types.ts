/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Rule, RuleTypeParams } from '../../types';

export interface CreateRuleBody<Params extends RuleTypeParams = RuleTypeParams> {
  name: Rule<Params>['name'];
  ruleTypeId: Rule<Params>['ruleTypeId'];
  enabled: Rule<Params>['enabled'];
  consumer: Rule<Params>['consumer'];
  tags: Rule<Params>['tags'];
  params: Rule<Params>['params'];
  schedule: Rule<Params>['schedule'];
  actions: Rule<Params>['actions'];
  throttle?: Rule<Params>['throttle'];
  notifyWhen?: Rule<Params>['notifyWhen'];
  alertDelay?: Rule<Params>['alertDelay'];
  flapping?: Rule<Params>['flapping'];
  artifacts?: Rule<Params>['artifacts'];
}
