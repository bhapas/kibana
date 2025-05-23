/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSkeletonTitle, EuiTitle } from '@elastic/eui';
import { css } from '@emotion/react';
import {
  replaceAnonymizedValuesWithOriginalValues,
  type Replacements,
} from '@kbn/elastic-assistant-common';
import React, { useMemo } from 'react';

interface Props {
  isLoading: boolean;
  replacements?: Replacements;
  showAnonymized?: boolean;
  title: string;
}

const AccordionTitleComponent: React.FC<Props> = ({
  isLoading,
  replacements,
  showAnonymized = false,
  title,
}) => {
  const titleWithReplacements = useMemo(
    () =>
      replaceAnonymizedValuesWithOriginalValues({
        messageContent: title,
        replacements: { ...replacements },
      }),

    [replacements, title]
  );

  return (
    <EuiFlexGroup
      alignItems="center"
      data-test-subj="title"
      gutterSize="none"
      responsive={false}
      wrap={false}
    >
      <EuiFlexItem grow={true}>
        {isLoading ? (
          <EuiSkeletonTitle
            css={css`
              inline-size: 100%;
            `}
            data-test-subj="skeletonTitle"
            size="xs"
          />
        ) : (
          <EuiTitle data-test-subj="titleText" size="xs">
            <h2>{showAnonymized ? title : titleWithReplacements}</h2>
          </EuiTitle>
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

AccordionTitleComponent.displayName = 'AccordionTitle';

export const AccordionTitle = React.memo(AccordionTitleComponent);
