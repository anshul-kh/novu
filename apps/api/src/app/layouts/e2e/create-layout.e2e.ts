import { UserSession } from '@novu/testing';
import { expect } from 'chai';

import { LayoutId, TemplateVariableTypeEnum } from '../types';

const BASE_PATH = '/v1/layouts';

describe('Layout creation - /layouts (POST)', async () => {
  let session: UserSession;
  let initialDefaultLayoutId: LayoutId;

  before(async () => {
    session = new UserSession();
    await session.initialize();
  });

  it('should throw validation error for missing request payload information', async () => {
    const { body } = await session.testAgent.post(BASE_PATH).send({});

    expect(body.statusCode).to.equal(400);
    expect(body.message.find((i) => i.includes('name'))).to.be.ok;
    expect(body.message.find((i) => i.includes('content'))).to.be.ok;
    expect(body.message).to.eql([
      'name should not be null or undefined',
      'name must be a string',
      'content should not be null or undefined',
    ]);
  });

  it('should create a new layout successfully', async () => {
    const layoutName = 'layout-name-creation';
    const layoutDescription = 'Amazing new layout';
    const content = '<html><body><div>Hello {{organizationName}} {{{body}}}</div></body></html>';
    const variables = [
      { name: 'organizationName', type: TemplateVariableTypeEnum.STRING, defaultValue: 'Company', required: false },
    ];
    const isDefault = true;
    const response = await session.testAgent.post(BASE_PATH).send({
      name: layoutName,
      description: layoutDescription,
      content,
      variables,
      isDefault,
    });

    expect(response.statusCode).to.eql(201);

    const { body } = response;
    initialDefaultLayoutId = body.data._id;

    expect(initialDefaultLayoutId).to.exist;
    expect(initialDefaultLayoutId).to.be.string;
  });

  it('if the layout created is assigned as default it should set as non default the existing default layout', async () => {
    const firstLayoutUrl = `${BASE_PATH}/${initialDefaultLayoutId}`;
    const firstLayoutResponse = await session.testAgent.get(firstLayoutUrl);
    expect(firstLayoutResponse.body.data._id).to.eql(initialDefaultLayoutId);
    expect(firstLayoutResponse.body.data.isDefault).to.eql(true);

    const layoutName = 'layout-name-creation-new-default';
    const layoutDescription = 'new-default-layout';
    const content = [
      {
        type: 'text',
        content: 'This are the text contents of the template for {{firstName}}',
      },
      {
        type: 'button',
        content: 'SIGN UP',
        url: 'https://url-of-app.com/{{urlVariable}}',
      },
    ];
    const variables = [
      { name: 'firstName', type: TemplateVariableTypeEnum.STRING, defaultValue: 'John', required: false },
    ];
    const isDefault = true;
    const response = await session.testAgent.post(BASE_PATH).send({
      name: layoutName,
      description: layoutDescription,
      content,
      variables,
      isDefault,
    });

    expect(response.statusCode).to.eql(201);

    const firstLayoutNonDefaultResponse = await session.testAgent.get(firstLayoutUrl);
    expect(firstLayoutNonDefaultResponse.body.data._id).to.eql(initialDefaultLayoutId);
    expect(firstLayoutNonDefaultResponse.body.data.isDefault).to.eql(false);

    const secondLayoutId = response.body.data._id;
    const secondLayoutUrl = `${BASE_PATH}/${secondLayoutId}`;
    const secondLayoutDefaultResponse = await session.testAgent.get(secondLayoutUrl);
    expect(secondLayoutDefaultResponse.body.data._id).to.eql(secondLayoutId);
    expect(secondLayoutDefaultResponse.body.data.name).to.eql(layoutName);
    expect(secondLayoutDefaultResponse.body.data.isDefault).to.eql(true);
  });
});
