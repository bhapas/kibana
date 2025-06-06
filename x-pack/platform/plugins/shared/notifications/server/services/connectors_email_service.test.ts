/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { unsecuredActionsClientMock } from '@kbn/actions-plugin/server/unsecured_actions_client/unsecured_actions_client.mock';
import { ConnectorsEmailService } from './connectors_email_service';
import type { PlainTextEmail, HTMLEmail, AttachmentEmail } from './types';
import { ExecutionResponseType } from '@kbn/actions-plugin/server/create_execute_function';

const REQUESTER_ID = 'requesterId';
const CONNECTOR_ID = 'connectorId';

describe('sendPlainTextEmail()', () => {
  const logger = loggerMock.create();
  beforeEach(() => {
    loggerMock.clear(logger);
  });

  describe('calls the provided ActionsClient#bulkEnqueueExecution() with the appropriate params', () => {
    it(`omits the 'relatedSavedObjects' field if no context is provided`, async () => {
      const actionsClient = unsecuredActionsClientMock.create();
      actionsClient.bulkEnqueueExecution.mockResolvedValueOnce({
        errors: false,
        items: [
          {
            id: CONNECTOR_ID,
            response: ExecutionResponseType.SUCCESS,
            actionTypeId: 'test',
          },
        ],
      });
      const email = new ConnectorsEmailService(REQUESTER_ID, CONNECTOR_ID, actionsClient, logger);
      const payload: PlainTextEmail = {
        to: ['user1@email.com'],
        subject: 'This is a notification email',
        message: 'With some contents inside.',
      };

      await email.sendPlainTextEmail(payload);

      expect(actionsClient.bulkEnqueueExecution).toHaveBeenCalledTimes(1);
      expect(actionsClient.bulkEnqueueExecution).toHaveBeenCalledWith(REQUESTER_ID, [
        {
          id: CONNECTOR_ID,
          params: {
            to: ['user1@email.com'],
            subject: 'This is a notification email',
            message: 'With some contents inside.',
          },
        },
      ]);
    });

    it(`populates the 'relatedSavedObjects' field if context is provided`, async () => {
      const actionsClient = unsecuredActionsClientMock.create();
      actionsClient.bulkEnqueueExecution.mockResolvedValueOnce({
        errors: false,
        items: [
          {
            id: CONNECTOR_ID,
            response: ExecutionResponseType.SUCCESS,
            actionTypeId: 'test',
          },
        ],
      });
      const email = new ConnectorsEmailService(REQUESTER_ID, CONNECTOR_ID, actionsClient, logger);
      const payload: PlainTextEmail = {
        to: ['user1@email.com', 'user2@email.com', 'user3@email.com'],
        subject: 'This is a notification email',
        message: 'With some contents inside.',
        context: {
          relatedObjects: [
            {
              id: '9c9456a4-c160-46f5-96f7-e9ac734d0d9b',
              type: 'cases',
              namespace: 'space1',
            },
          ],
        },
      };

      await email.sendPlainTextEmail(payload);

      expect(actionsClient.bulkEnqueueExecution).toHaveBeenCalledTimes(1);
      expect(actionsClient.bulkEnqueueExecution).toHaveBeenCalledWith(REQUESTER_ID, [
        {
          id: CONNECTOR_ID,
          params: {
            to: ['user1@email.com'],
            subject: 'This is a notification email',
            message: 'With some contents inside.',
          },
          relatedSavedObjects: [
            {
              id: '9c9456a4-c160-46f5-96f7-e9ac734d0d9b',
              type: 'cases',
              namespace: 'space1',
            },
          ],
        },
        {
          id: CONNECTOR_ID,
          params: {
            to: ['user2@email.com'],
            subject: 'This is a notification email',
            message: 'With some contents inside.',
          },
          relatedSavedObjects: [
            {
              id: '9c9456a4-c160-46f5-96f7-e9ac734d0d9b',
              type: 'cases',
              namespace: 'space1',
            },
          ],
        },
        {
          id: CONNECTOR_ID,
          params: {
            to: ['user3@email.com'],
            subject: 'This is a notification email',
            message: 'With some contents inside.',
          },
          relatedSavedObjects: [
            {
              id: '9c9456a4-c160-46f5-96f7-e9ac734d0d9b',
              type: 'cases',
              namespace: 'space1',
            },
          ],
        },
      ]);
    });

    it(`logs an error when the maximum number of queued actions has been reached`, async () => {
      const actionsClient = unsecuredActionsClientMock.create();
      actionsClient.bulkEnqueueExecution.mockResolvedValueOnce({
        errors: true,
        items: [
          {
            id: CONNECTOR_ID,
            response: ExecutionResponseType.QUEUED_ACTIONS_LIMIT_ERROR,
            actionTypeId: 'test',
          },
        ],
      });
      const email = new ConnectorsEmailService(REQUESTER_ID, CONNECTOR_ID, actionsClient, logger);
      const payload: PlainTextEmail = {
        to: ['user1@email.com'],
        subject: 'This is a notification email',
        message: 'With some contents inside.',
      };

      await email.sendPlainTextEmail(payload);

      expect(logger.warn).toHaveBeenCalled();
    });
  });
});

describe('sendHTMLEmail()', () => {
  const logger = loggerMock.create();
  beforeEach(() => {
    loggerMock.clear(logger);
  });

  describe('calls the provided ActionsClient#bulkEnqueueExecution() with the appropriate params', () => {
    it(`omits the 'relatedSavedObjects' field if no context is provided`, async () => {
      const actionsClient = unsecuredActionsClientMock.create();
      actionsClient.bulkEnqueueExecution.mockResolvedValueOnce({
        errors: false,
        items: [
          {
            id: CONNECTOR_ID,
            response: ExecutionResponseType.SUCCESS,
            actionTypeId: 'test',
          },
        ],
      });
      const email = new ConnectorsEmailService(REQUESTER_ID, CONNECTOR_ID, actionsClient, logger);
      const payload: HTMLEmail = {
        to: ['user1@email.com'],
        subject: 'This is a notification email',
        message: 'With some contents inside.',
        messageHTML: '<html><body><span>With some contents inside.</span></body></html>',
      };

      await email.sendHTMLEmail(payload);

      expect(actionsClient.bulkEnqueueExecution).toHaveBeenCalledTimes(1);
      expect(actionsClient.bulkEnqueueExecution).toHaveBeenCalledWith(REQUESTER_ID, [
        {
          id: CONNECTOR_ID,
          params: {
            to: ['user1@email.com'],
            subject: 'This is a notification email',
            message: 'With some contents inside.',
            messageHTML: '<html><body><span>With some contents inside.</span></body></html>',
          },
        },
      ]);
    });

    it(`populates the 'relatedSavedObjects' field if context is provided`, async () => {
      const actionsClient = unsecuredActionsClientMock.create();
      actionsClient.bulkEnqueueExecution.mockResolvedValueOnce({
        errors: false,
        items: [
          {
            id: CONNECTOR_ID,
            response: ExecutionResponseType.SUCCESS,
            actionTypeId: 'test',
          },
        ],
      });
      const email = new ConnectorsEmailService(REQUESTER_ID, CONNECTOR_ID, actionsClient, logger);
      const payload: HTMLEmail = {
        to: ['user1@email.com', 'user2@email.com', 'user3@email.com'],
        subject: 'This is a notification email',
        message: 'With some contents inside.',
        messageHTML: '<html><body><span>With some contents inside.</span></body></html>',
        context: {
          relatedObjects: [
            {
              id: '9c9456a4-c160-46f5-96f7-e9ac734d0d9b',
              type: 'cases',
              namespace: 'space1',
            },
          ],
        },
      };

      await email.sendHTMLEmail(payload);

      expect(actionsClient.bulkEnqueueExecution).toHaveBeenCalledTimes(1);
      expect(actionsClient.bulkEnqueueExecution).toHaveBeenCalledWith(REQUESTER_ID, [
        {
          id: CONNECTOR_ID,
          params: {
            to: ['user1@email.com'],
            subject: 'This is a notification email',
            message: 'With some contents inside.',
            messageHTML: '<html><body><span>With some contents inside.</span></body></html>',
          },
          relatedSavedObjects: [
            {
              id: '9c9456a4-c160-46f5-96f7-e9ac734d0d9b',
              type: 'cases',
              namespace: 'space1',
            },
          ],
        },
        {
          id: CONNECTOR_ID,
          params: {
            to: ['user2@email.com'],
            subject: 'This is a notification email',
            message: 'With some contents inside.',
            messageHTML: '<html><body><span>With some contents inside.</span></body></html>',
          },
          relatedSavedObjects: [
            {
              id: '9c9456a4-c160-46f5-96f7-e9ac734d0d9b',
              type: 'cases',
              namespace: 'space1',
            },
          ],
        },
        {
          id: CONNECTOR_ID,
          params: {
            to: ['user3@email.com'],
            subject: 'This is a notification email',
            message: 'With some contents inside.',
            messageHTML: '<html><body><span>With some contents inside.</span></body></html>',
          },
          relatedSavedObjects: [
            {
              id: '9c9456a4-c160-46f5-96f7-e9ac734d0d9b',
              type: 'cases',
              namespace: 'space1',
            },
          ],
        },
      ]);
    });
    it(`logs an error when the maximum number of queued actions has been reached`, async () => {
      const actionsClient = unsecuredActionsClientMock.create();
      actionsClient.bulkEnqueueExecution.mockResolvedValueOnce({
        errors: true,
        items: [
          {
            id: CONNECTOR_ID,
            response: ExecutionResponseType.QUEUED_ACTIONS_LIMIT_ERROR,
            actionTypeId: 'test',
          },
        ],
      });
      const email = new ConnectorsEmailService(REQUESTER_ID, CONNECTOR_ID, actionsClient, logger);
      const payload: HTMLEmail = {
        to: ['user1@email.com'],
        subject: 'This is a notification email',
        message: 'With some contents inside.',
        messageHTML: '<html><body><span>With some contents inside.</span></body></html>',
      };

      await email.sendHTMLEmail(payload);

      expect(logger.warn).toHaveBeenCalled();
    });
  });
});

describe('sendAttachmentEmail()', () => {
  const logger = loggerMock.create();
  beforeEach(() => {
    loggerMock.clear(logger);
  });

  describe('calls the provided ActionsClient#execute() with the appropriate params', () => {
    it(`omits the 'relatedSavedObjects' field if no context is provided`, async () => {
      const actionsClient = unsecuredActionsClientMock.create();
      actionsClient.execute.mockResolvedValueOnce({ status: 'ok', actionId: CONNECTOR_ID });
      const email = new ConnectorsEmailService(REQUESTER_ID, CONNECTOR_ID, actionsClient, logger);
      const payload: AttachmentEmail = {
        to: ['user1@email.com'],
        subject: 'This is a notification email',
        message: 'With some contents inside.',
        attachments: [
          {
            content: 'test output',
            contentType: 'test content_type',
            encoding: 'base64',
            filename: 'report.pdf',
          },
        ],
        spaceId: 'space1',
      };

      await email.sendAttachmentEmail(payload);

      expect(actionsClient.execute).toHaveBeenCalledTimes(1);
      expect(actionsClient.execute).toHaveBeenCalledWith({
        id: 'connectorId',
        params: {
          attachments: [
            {
              content: 'test output',
              contentType: 'test content_type',
              encoding: 'base64',
              filename: 'report.pdf',
            },
          ],
          message: 'With some contents inside.',
          subject: 'This is a notification email',
          to: ['user1@email.com'],
        },
        requesterId: 'requesterId',
        spaceId: 'space1',
      });
    });

    it(`populates the 'relatedSavedObjects' field if context is provided`, async () => {
      const actionsClient = unsecuredActionsClientMock.create();
      actionsClient.execute.mockResolvedValueOnce({ status: 'ok', actionId: CONNECTOR_ID });
      const email = new ConnectorsEmailService(REQUESTER_ID, CONNECTOR_ID, actionsClient, logger);
      const payload: AttachmentEmail = {
        to: ['user1@email.com'],
        subject: 'This is a notification email',
        message: 'With some contents inside.',
        attachments: [
          {
            content: 'test output',
            contentType: 'test content_type',
            encoding: 'base64',
            filename: 'report.pdf',
          },
        ],
        spaceId: 'space1',
        context: {
          relatedObjects: [
            {
              id: '9c9456a4-c160-46f5-96f7-e9ac734d0d9b',
              type: 'cases',
              namespace: 'space1',
            },
          ],
        },
      };

      await email.sendAttachmentEmail(payload);

      expect(actionsClient.execute).toHaveBeenCalledTimes(1);
      expect(actionsClient.execute).toHaveBeenCalledWith({
        id: 'connectorId',
        params: {
          attachments: [
            {
              content: 'test output',
              contentType: 'test content_type',
              encoding: 'base64',
              filename: 'report.pdf',
            },
          ],
          bcc: undefined,
          cc: undefined,
          message: 'With some contents inside.',
          subject: 'This is a notification email',
          to: ['user1@email.com'],
        },
        relatedSavedObjects: [
          {
            id: '9c9456a4-c160-46f5-96f7-e9ac734d0d9b',
            namespace: 'space1',
            type: 'cases',
          },
        ],
        requesterId: 'requesterId',
        spaceId: 'space1',
      });
    });

    it(`logs an error when the maximum number of queued actions has been reached`, async () => {
      const actionsClient = unsecuredActionsClientMock.create();
      actionsClient.execute.mockResolvedValueOnce({
        status: 'error',
        actionId: CONNECTOR_ID,
        message: 'There was an error sending the email.',
      });
      const email = new ConnectorsEmailService(REQUESTER_ID, CONNECTOR_ID, actionsClient, logger);
      const payload: AttachmentEmail = {
        to: ['user1@email.com'],
        subject: 'This is a notification email',
        message: 'With some contents inside.',
        attachments: [],
        spaceId: 'space1',
      };

      await expect(email.sendAttachmentEmail(payload)).rejects.toThrowErrorMatchingInlineSnapshot(
        `"There was an error sending the email."`
      );
    });
  });
});
