/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, screen } from '@testing-library/react';
import { render } from '@testing-library/react';
import { TabularPage } from './tabular_page';
import { InferenceAPIConfigResponse } from '@kbn/ml-trained-models-utils';

const inferenceEndpoints = [
  {
    inference_id: 'my-elser-model-05',
    task_type: 'sparse_embedding',
    service: 'elasticsearch',
    service_settings: {
      num_allocations: 1,
      num_threads: 1,
      model_id: '.elser_model_2',
    },
    task_settings: {},
  },
  {
    inference_id: 'local-model',
    task_type: 'sparse_embedding',
    service: 'elasticsearch',
    service_settings: {
      num_allocations: 1,
      num_threads: 1,
      model_id: '.own_model',
    },
    task_settings: {},
  },
  {
    inference_id: 'third-party-model',
    task_type: 'sparse_embedding',
    service: 'openai',
    service_settings: {
      num_allocations: 1,
      num_threads: 1,
      model_id: '.own_model',
    },
    task_settings: {},
  },
  {
    inference_id: '.elser-2-elasticsearch',
    task_type: 'sparse_embedding',
    service: 'elasticsearch',
    service_settings: {
      num_allocations: 1,
      num_threads: 1,
      model_id: '.elser_model_2',
    },
    task_settings: {},
  },
  {
    inference_id: '.multilingual-e5-small-elasticsearch',
    task_type: 'text_embedding',
    service: 'elasticsearch',
    service_settings: {
      num_allocations: 1,
      num_threads: 1,
      model_id: '.multilingual-e5-small',
    },
    task_settings: {},
  },
  {
    inference_id: 'elastic-rerank',
    task_type: 'rerank',
    service: 'elasticsearch',
    service_settings: {
      num_allocations: 1,
      num_threads: 1,
      model_id: '.rerank-v1',
    },
    task_settings: {
      return_documents: true,
    },
  },
  {
    inference_id: '.sparkles',
    task_type: 'chat_completion',
    service: 'elastic',
    service_settings: {
      model_id: 'rainbow-sprinkles',
    },
  },
] as InferenceAPIConfigResponse[];

jest.mock('../../hooks/use_delete_endpoint', () => ({
  useDeleteEndpoint: () => ({
    mutate: jest.fn().mockImplementation(() => Promise.resolve()), // Mock implementation of the mutate function
  }),
}));

describe('When the tabular page is loaded', () => {
  it('should display all inference ids in the table', () => {
    render(<TabularPage inferenceEndpoints={inferenceEndpoints} />);

    const rows = screen.getAllByRole('row');
    expect(rows[1]).toHaveTextContent('.elser-2-elasticsearch');
    expect(rows[2]).toHaveTextContent('.multilingual-e5-small-elasticsearch');
    expect(rows[3]).toHaveTextContent('.sparkles');
    expect(rows[4]).toHaveTextContent('elastic-rerank');
    expect(rows[5]).toHaveTextContent('local-model');
    expect(rows[6]).toHaveTextContent('my-elser-model-05');
    expect(rows[7]).toHaveTextContent('third-party-model');
  });

  it('should display all service and model ids in the table', () => {
    render(<TabularPage inferenceEndpoints={inferenceEndpoints} />);

    const rows = screen.getAllByRole('row');
    expect(rows[1]).toHaveTextContent('Elasticsearch');
    expect(rows[1]).toHaveTextContent('.elser_model_2');

    expect(rows[2]).toHaveTextContent('Elasticsearch');
    expect(rows[2]).toHaveTextContent('.multilingual-e5-small');

    expect(rows[3]).toHaveTextContent('Elastic');
    expect(rows[3]).toHaveTextContent('rainbow-sprinkles');

    expect(rows[4]).toHaveTextContent('Elasticsearch');
    expect(rows[4]).toHaveTextContent('.rerank-v1');

    expect(rows[5]).toHaveTextContent('Elasticsearch');
    expect(rows[5]).toHaveTextContent('.own_model');

    expect(rows[6]).toHaveTextContent('Elasticsearch');
    expect(rows[6]).toHaveTextContent('.elser_model_2');

    expect(rows[7]).toHaveTextContent('OpenAI');
    expect(rows[7]).toHaveTextContent('.own_model');
  });

  it('should only disable delete action for preconfigured endpoints', () => {
    render(<TabularPage inferenceEndpoints={inferenceEndpoints} />);

    act(() => {
      screen.getAllByTestId('euiCollapsedItemActionsButton')[0].click();
    });

    const deleteAction = screen.getByTestId(/inferenceUIDeleteAction/);

    expect(deleteAction).toBeDisabled();
  });

  it('should not disable delete action for other endpoints', () => {
    render(<TabularPage inferenceEndpoints={inferenceEndpoints} />);

    act(() => {
      screen.getAllByTestId('euiCollapsedItemActionsButton')[4].click();
    });

    const deleteAction = screen.getByTestId(/inferenceUIDeleteAction/);

    expect(deleteAction).toBeEnabled();
  });

  it('should show preconfigured badge only for preconfigured endpoints', () => {
    render(<TabularPage inferenceEndpoints={inferenceEndpoints} />);

    const preconfigured = 'PRECONFIGURED';

    const rows = screen.getAllByRole('row');
    expect(rows[1]).toHaveTextContent(preconfigured);
    expect(rows[2]).toHaveTextContent(preconfigured);
    expect(rows[3]).toHaveTextContent(preconfigured);
    expect(rows[4]).not.toHaveTextContent(preconfigured);
    expect(rows[5]).not.toHaveTextContent(preconfigured);
    expect(rows[6]).not.toHaveTextContent(preconfigured);
  });

  it('should show tech preview badge only for reranker-v1 model', () => {
    render(<TabularPage inferenceEndpoints={inferenceEndpoints} />);

    const techPreview = 'TECH PREVIEW';

    const rows = screen.getAllByRole('row');
    expect(rows[1]).not.toHaveTextContent(techPreview);
    expect(rows[2]).not.toHaveTextContent(techPreview);
    expect(rows[3]).toHaveTextContent(techPreview);
    expect(rows[4]).toHaveTextContent(techPreview);
    expect(rows[5]).not.toHaveTextContent(techPreview);
    expect(rows[6]).not.toHaveTextContent(techPreview);
    expect(rows[7]).not.toHaveTextContent(techPreview);
  });
});
