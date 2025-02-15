import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import JSONAPIAdapter from '@ember-data/adapter/json-api';
import Model, { attr, belongsTo, hasMany } from '@ember-data/model';
import JSONAPISerializer from '@ember-data/serializer/json-api';

module('inverse relationship load test', function (hooks) {
  let store;
  setupTest(hooks);

  hooks.beforeEach(function () {
    let { owner } = this;
    store = owner.lookup('service:store');
    owner.register(
      'serializer:application',
      JSONAPISerializer.extend({
        normalizeResponse(_, __, payload) {
          return payload;
        },
      })
    );
  });

  test('one-to-many - findHasMany/explicit inverse - adds parent relationship information to the payload if it is not included/added by the serializer', async function (assert) {
    let { owner } = this;

    owner.register(
      'adapter:application',
      JSONAPIAdapter.extend({
        deleteRecord: () => Promise.resolve({ data: null }),
        findHasMany: () => {
          return Promise.resolve({
            data: [
              {
                id: '1',
                type: 'dog',
                attributes: {
                  name: 'Scooby',
                },
              },
              {
                id: '2',
                type: 'dog',
                attributes: {
                  name: 'Scrappy',
                },
              },
            ],
          });
        },
      })
    );

    class Person extends Model {
      @hasMany('dog', {
        async: true,
        inverse: 'pal',
      })
      dogs;
    }
    owner.register('model:person', Person);

    class Dog extends Model {
      @belongsTo('person', {
        async: true,
        inverse: 'dogs',
      })
      pal;
    }
    owner.register('model:dog', Dog);

    let person = store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: 'John Churchill',
        },
        relationships: {
          dogs: {
            links: {
              related: 'http://example.com/person/1/dogs',
            },
          },
        },
      },
    });

    let dogs = await person.dogs;
    assert.false(person.hasMany('dogs').hasManyRelationship.state.isEmpty, 'relationship state was set up correctly');

    assert.strictEqual(dogs.length, 2, 'hasMany relationship has correct number of records');
    let dog1 = dogs.at(0);
    let dogPerson1 = await dog1.pal;
    assert.strictEqual(
      dogPerson1.id,
      '1',
      'dog.person inverse relationship is set up correctly when adapter does not include parent relationships in data.relationships'
    );
    let dogPerson2 = await dogs.at(1).pal;
    assert.strictEqual(
      dogPerson2.id,
      '1',
      'dog.person inverse relationship is set up correctly when adapter does not include parent relationships in data.relationships'
    );

    await dog1.destroyRecord();
    assert.strictEqual(dogs.length, 1, 'record removed from hasMany relationship after deletion');
    assert.strictEqual(dogs.at(0).id, '2', 'hasMany relationship has correct records');
  });

  test('one-to-many (left hand async, right hand sync) - findHasMany/explicit inverse - adds parent relationship information to the payload if it is not included/added by the serializer', async function (assert) {
    let { owner } = this;

    owner.register(
      'adapter:application',
      JSONAPIAdapter.extend({
        deleteRecord: () => Promise.resolve({ data: null }),
        findHasMany: () => {
          return Promise.resolve({
            data: [
              {
                id: '1',
                type: 'dog',
                attributes: {
                  name: 'Scooby',
                },
              },
              {
                id: '2',
                type: 'dog',
                attributes: {
                  name: 'Scrappy',
                },
              },
            ],
          });
        },
      })
    );

    class Person extends Model {
      @hasMany('dog', {
        async: true,
        inverse: 'pal',
      })
      dogs;
    }
    owner.register('model:person', Person);

    class Dog extends Model {
      @belongsTo('person', {
        async: false,
        inverse: 'dogs',
      })
      pal;
    }
    owner.register('model:dog', Dog);

    let person = store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: 'John Churchill',
        },
        relationships: {
          dogs: {
            links: {
              related: 'http://example.com/person/1/dogs',
            },
          },
        },
      },
    });

    let dogs = await person.dogs;
    assert.false(person.hasMany('dogs').hasManyRelationship.state.isEmpty, 'relationship state was set up correctly');

    assert.strictEqual(dogs.length, 2, 'hasMany relationship has correct number of records');
    let dog1 = dogs.at(0);
    let dogPerson1 = await dog1.pal;
    assert.strictEqual(
      dogPerson1.id,
      '1',
      'dog.person inverse relationship is set up correctly when adapter does not include parent relationships in data.relationships'
    );
    let dogPerson2 = await dogs.at(1).pal;
    assert.strictEqual(
      dogPerson2.id,
      '1',
      'dog.person inverse relationship is set up correctly when adapter does not include parent relationships in data.relationships'
    );

    await dog1.destroyRecord();
    assert.strictEqual(dogs.length, 1, 'record removed from hasMany relationship after deletion');
    assert.strictEqual(dogs.at(0).id, '2', 'hasMany relationship has correct records');
  });

  test('one-to-many - findHasMany/null inverse - adds parent relationship information to the payload if it is not included/added by the serializer', async function (assert) {
    let { owner } = this;

    owner.register(
      'adapter:application',
      JSONAPIAdapter.extend({
        deleteRecord() {
          return Promise.resolve({
            data: null,
          });
        },
        findHasMany: () => {
          return Promise.resolve({
            data: [
              {
                id: '1',
                type: 'dog',
                attributes: {
                  name: 'Scooby',
                },
              },
              {
                id: '2',
                type: 'dog',
                attributes: {
                  name: 'Scrappy',
                },
              },
            ],
          });
        },
      })
    );

    class Person extends Model {
      @hasMany('dog', {
        inverse: null,
        async: true,
      })
      dogs;
      @attr()
      name;
    }
    owner.register('model:person', Person);

    class Dog extends Model {
      @attr()
      name;
    }

    owner.register('model:dog', Dog);

    let person = store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: 'John Churchill',
        },
        relationships: {
          dogs: {
            links: {
              related: 'http://example.com/person/1/dogs',
            },
          },
        },
      },
    });

    let dogs = await person.dogs;
    assert.false(person.hasMany('dogs').hasManyRelationship.state.isEmpty);
    assert.strictEqual(dogs.length, 2);
    assert.deepEqual(
      dogs.map((r) => r.id),
      ['1', '2']
    );

    let dog1 = dogs.at(0);
    await dog1.destroyRecord();
    assert.strictEqual(dogs.length, 1);
    assert.strictEqual(dogs.at(0).id, '2');
  });

  test('one-to-one - findBelongsTo/explicit inverse - ensures inverse relationship is set up when payload does not return parent relationship info', async function (assert) {
    let { owner } = this;

    owner.register(
      'adapter:application',
      JSONAPIAdapter.extend({
        deleteRecord() {
          return Promise.resolve({
            data: null,
          });
        },
        findBelongsTo() {
          return Promise.resolve({
            data: {
              id: '1',
              type: 'dog',
              attributes: {
                name: 'Scooby',
              },
            },
          });
        },
      })
    );

    class Person extends Model {
      @attr()
      name;
      @belongsTo('dog', { async: true, inverse: 'pal' })
      favoriteDog;
    }
    owner.register('model:person', Person);

    class Dog extends Model {
      @attr()
      name;
      @belongsTo('person', { async: true, inverse: 'favoriteDog' })
      pal;
    }
    owner.register('model:dog', Dog);

    let person = store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: 'John Churchill',
        },
        relationships: {
          favoriteDog: {
            links: {
              related: 'http://example.com/person/1/favorite-dog',
            },
          },
        },
      },
    });

    let favoriteDog = await person.favoriteDog;
    assert.false(person.belongsTo('favoriteDog').belongsToRelationship.state.isEmpty);
    assert.strictEqual(favoriteDog.id, '1', 'favoriteDog id is set correctly');
    let favoriteDogPerson = await favoriteDog.pal;
    assert.strictEqual(
      favoriteDogPerson.id,
      '1',
      'favoriteDog.pal inverse relationship is set up correctly when adapter does not include parent relationships in data.relationships'
    );
    await favoriteDog.destroyRecord();
    favoriteDog = await person.favoriteDog;
    assert.strictEqual(favoriteDog, null);
  });

  test('one-to-one (left hand async, right hand sync) - findBelongsTo/explicit inverse - ensures inverse relationship is set up when payload does not return parent relationship info', async function (assert) {
    let { owner } = this;

    owner.register(
      'adapter:application',
      JSONAPIAdapter.extend({
        deleteRecord() {
          return Promise.resolve({
            data: null,
          });
        },
        findBelongsTo() {
          return Promise.resolve({
            data: {
              id: '1',
              type: 'dog',
              attributes: {
                name: 'Scooby',
              },
            },
          });
        },
      })
    );

    class Person extends Model {
      @attr()
      name;
      @belongsTo('dog', { async: true, inverse: 'pal' })
      favoriteDog;
    }
    owner.register('model:person', Person);

    class Dog extends Model {
      @attr()
      name;
      @belongsTo('person', { async: true, inverse: 'favoriteDog' })
      pal;
    }
    owner.register('model:dog', Dog);

    let person = store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: 'John Churchill',
        },
        relationships: {
          favoriteDog: {
            links: {
              related: 'http://example.com/person/1/favorite-dog',
            },
          },
        },
      },
    });

    let favoriteDog = await person.favoriteDog;
    assert.false(person.belongsTo('favoriteDog').belongsToRelationship.state.isEmpty);
    assert.strictEqual(favoriteDog.id, '1', 'favoriteDog id is set correctly');
    let favoriteDogPerson = await favoriteDog.pal;
    assert.strictEqual(
      favoriteDogPerson.id,
      '1',
      'favoriteDog.pal inverse relationship is set up correctly when adapter does not include parent relationships in data.relationships'
    );
    await favoriteDog.destroyRecord();
    favoriteDog = await person.favoriteDog;
    assert.strictEqual(favoriteDog, null);
  });

  test('one-to-one - findBelongsTo/null inverse - ensures inverse relationship is set up when payload does not return parent relationship info', async function (assert) {
    let { owner } = this;

    owner.register(
      'adapter:application',
      JSONAPIAdapter.extend({
        deleteRecord() {
          return Promise.resolve({
            data: null,
          });
        },
        findBelongsTo() {
          return Promise.resolve({
            data: {
              id: '1',
              type: 'dog',
              attributes: {
                name: 'Scooby',
              },
            },
          });
        },
      })
    );

    class Person extends Model {
      @attr()
      name;
      @belongsTo('dog', { async: true, inverse: null })
      favoriteDog;
    }
    owner.register('model:person', Person);

    class Dog extends Model {
      @attr()
      name;
    }
    owner.register('model:dog', Dog);

    let person = store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: 'John Churchill',
        },
        relationships: {
          favoriteDog: {
            links: {
              related: 'http://example.com/person/1/favorite-dog',
            },
          },
        },
      },
    });

    let favoriteDog = await person.favoriteDog;
    assert.false(person.belongsTo('favoriteDog').belongsToRelationship.state.isEmpty);
    assert.strictEqual(favoriteDog.id, '1', 'favoriteDog id is set correctly');
    await favoriteDog.destroyRecord();
    favoriteDog = await person.favoriteDog;
    assert.strictEqual(favoriteDog, null);
  });

  test('many-to-many - findHasMany/explicit inverse - adds parent relationship information to the payload if it is not included/added by the serializer', async function (assert) {
    let { owner } = this;

    owner.register(
      'adapter:application',
      JSONAPIAdapter.extend({
        deleteRecord: () => Promise.resolve({ data: null }),
        findHasMany: () => {
          return Promise.resolve({
            data: [
              {
                id: '1',
                type: 'dog',
                attributes: {
                  name: 'Scooby',
                },
              },
              {
                id: '2',
                type: 'dog',
                attributes: {
                  name: 'Scrappy',
                },
              },
            ],
          });
        },
      })
    );

    class Person extends Model {
      @hasMany('dog', {
        async: true,
        inverse: 'pals',
      })
      dogs;
    }
    owner.register('model:person', Person);

    class Dog extends Model {
      @hasMany('person', {
        async: true,
        inverse: 'dogs',
      })
      pals;
    }
    owner.register('model:dog', Dog);

    let person = store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: 'John Churchill',
        },
        relationships: {
          dogs: {
            links: {
              related: 'http://example.com/person/1/dogs',
            },
          },
        },
      },
    });

    let dogs = await person.dogs;
    assert.false(person.hasMany('dogs').hasManyRelationship.state.isEmpty);

    assert.strictEqual(dogs.length, 2, 'left hand side relationship is set up with correct number of records');
    let [dog1, dog2] = dogs.slice();
    let dog1Pals = await dog1.pals;
    assert.strictEqual(dog1Pals.length, 1, 'dog1.pals inverse relationship includes correct number of records');
    assert.strictEqual(dog1Pals.at(0).id, '1', 'dog1.pals inverse relationship is set up correctly');

    let dog2Pals = await dog2.pals;
    assert.strictEqual(dog2Pals.length, 1, 'dog2.pals inverse relationship includes correct number of records');
    assert.strictEqual(dog2Pals.at(0).id, '1', 'dog2.pals inverse relationship is set up correctly');

    await dog1.destroyRecord();
    assert.strictEqual(dogs.length, 1, 'person.dogs relationship was updated when record removed');
    assert.strictEqual(dogs.at(0).id, '2', 'person.dogs relationship has the correct records');
  });

  test('many-to-many (left hand async, right hand sync) - findHasMany/explicit inverse - adds parent relationship information to the payload if it is not included/added by the serializer', async function (assert) {
    let { owner } = this;

    owner.register(
      'adapter:application',
      JSONAPIAdapter.extend({
        deleteRecord: () => Promise.resolve({ data: null }),
        findHasMany: () => {
          return Promise.resolve({
            data: [
              {
                id: '1',
                type: 'dog',
                attributes: {
                  name: 'Scooby',
                },
              },
              {
                id: '2',
                type: 'dog',
                attributes: {
                  name: 'Scrappy',
                },
              },
            ],
          });
        },
      })
    );

    class Person extends Model {
      @hasMany('dog', {
        async: true,
        inverse: 'pals',
      })
      dogs;
    }
    owner.register('model:person', Person);

    class Dog extends Model {
      @hasMany('person', {
        async: false,
        inverse: 'dogs',
      })
      pals;
    }
    owner.register('model:dog', Dog);

    let person = store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: 'John Churchill',
        },
        relationships: {
          dogs: {
            links: {
              related: 'http://example.com/person/1/dogs',
            },
          },
        },
      },
    });

    let dogs = await person.dogs;
    assert.false(person.hasMany('dogs').hasManyRelationship.state.isEmpty);

    assert.strictEqual(dogs.length, 2, 'left hand side relationship is set up with correct number of records');
    let [dog1, dog2] = dogs.slice();
    let dog1Pals = await dog1.pals;
    assert.strictEqual(dog1Pals.length, 1, 'dog1.pals inverse relationship includes correct number of records');
    assert.strictEqual(dog1Pals.at(0).id, '1', 'dog1.pals inverse relationship is set up correctly');

    let dog2Pals = await dog2.pals;
    assert.strictEqual(dog2Pals.length, 1, 'dog2.pals inverse relationship includes correct number of records');
    assert.strictEqual(dog2Pals.at(0).id, '1', 'dog2.pals inverse relationship is set up correctly');

    await dog1.destroyRecord();
    assert.strictEqual(dogs.length, 1, 'person.dogs relationship was updated when record removed');
    assert.strictEqual(dogs.at(0).id, '2', 'person.dogs relationship has the correct records');
  });

  test('many-to-one - findBelongsTo/explicit inverse - adds parent relationship information to the payload if it is not included/added by the serializer', async function (assert) {
    let { owner } = this;

    owner.register(
      'adapter:application',
      JSONAPIAdapter.extend({
        deleteRecord: () => Promise.resolve({ data: null }),
        findBelongsTo: () => {
          return Promise.resolve({
            data: {
              type: 'person',
              id: '1',
              attributes: {
                name: 'John Churchill',
              },
            },
          });
        },
      })
    );

    class Person extends Model {
      @hasMany('dog', {
        async: true,
        inverse: 'pal',
      })
      dogs;
    }
    owner.register('model:person', Person);

    class Dog extends Model {
      @belongsTo('person', {
        async: true,
        inverse: 'dogs',
      })
      pal;
    }
    owner.register('model:dog', Dog);

    let dog = store.push({
      data: {
        type: 'dog',
        id: '1',
        attributes: {
          name: 'A Really Good Dog',
        },
        relationships: {
          pal: {
            links: {
              related: 'http://example.com/person/1',
            },
          },
        },
      },
    });

    let person = await dog.pal;
    assert.false(
      dog.belongsTo('pal').belongsToRelationship.state.isEmpty,
      'belongsTo relationship state was populated'
    );
    assert.strictEqual(person.id, '1', 'dog.person relationship is correctly set up');

    let dogs = await person.dogs;

    assert.strictEqual(dogs.length, 1, 'person.dogs inverse relationship includes correct number of records');
    let [dog1] = dogs.slice();
    assert.strictEqual(dog1.id, '1', 'dog1.person inverse relationship is set up correctly');

    await person.destroyRecord();
    dog = await dog.pal;
    assert.strictEqual(dog, null, 'record deleted removed from belongsTo relationship');
  });

  test('many-to-one (left hand async, right hand sync) - findBelongsTo/explicit inverse - adds parent relationship information to the payload if it is not included/added by the serializer', async function (assert) {
    let { owner } = this;

    owner.register(
      'adapter:application',
      JSONAPIAdapter.extend({
        deleteRecord: () => Promise.resolve({ data: null }),
        findBelongsTo: () => {
          return Promise.resolve({
            data: {
              type: 'person',
              id: '1',
              attributes: {
                name: 'John Churchill',
              },
            },
          });
        },
      })
    );

    class Person extends Model {
      @hasMany('dog', {
        async: false,
        inverse: 'pal',
      })
      dogs;
    }
    owner.register('model:person', Person);

    class Dog extends Model {
      @belongsTo('person', {
        async: true,
        inverse: 'dogs',
      })
      pal;
    }
    owner.register('model:dog', Dog);

    let dog = store.push({
      data: {
        type: 'dog',
        id: '1',
        attributes: {
          name: 'A Really Good Dog',
        },
        relationships: {
          pal: {
            links: {
              related: 'http://example.com/person/1',
            },
          },
        },
      },
    });

    let person = await dog.pal;
    assert.false(
      dog.belongsTo('pal').belongsToRelationship.state.isEmpty,
      'belongsTo relationship state was populated'
    );
    assert.strictEqual(person.id, '1', 'dog.person relationship is correctly set up');

    let dogs = await person.dogs;

    assert.strictEqual(dogs.length, 1, 'person.dogs inverse relationship includes correct number of records');
    let [dog1] = dogs.slice();
    assert.strictEqual(dog1.id, '1', 'dog1.person inverse relationship is set up correctly');

    await person.destroyRecord();
    dog = await dog.pal;
    assert.strictEqual(dog, null, 'record deleted removed from belongsTo relationship');
  });

  test('one-to-many - ids/non-link/explicit inverse - ids - records loaded through ids/findRecord are linked to the parent if the response from the server does not include relationship information', async function (assert) {
    let { owner } = this;

    const scooby = {
      id: '1',
      type: 'dog',
      attributes: {
        name: 'Scooby',
      },
    };

    const scrappy = {
      id: '2',
      type: 'dog',
      attributes: {
        name: 'Scrappy',
      },
    };

    owner.register(
      'adapter:application',
      JSONAPIAdapter.extend({
        deleteRecord: () => Promise.resolve({ data: null }),
        findRecord: (_store, _type, id) => {
          const dog = id === '1' ? scooby : scrappy;
          return Promise.resolve({
            data: dog,
          });
        },
      })
    );

    class Person extends Model {
      @hasMany('dog', {
        async: true,
        inverse: 'pal',
      })
      dogs;
    }
    owner.register('model:person', Person);

    class Dog extends Model {
      @belongsTo('person', {
        async: true,
        inverse: 'dogs',
      })
      pal;
    }
    owner.register('model:dog', Dog);

    let person = store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: 'John Churchill',
        },
        relationships: {
          dogs: {
            data: [
              {
                id: '1',
                type: 'dog',
              },
              {
                id: '2',
                type: 'dog',
              },
            ],
          },
        },
      },
    });

    let dogs = await person.dogs;
    assert.false(person.hasMany('dogs').hasManyRelationship.state.isEmpty, 'relationship state was set up correctly');

    assert.strictEqual(dogs.length, 2, 'hasMany relationship has correct number of records');
    let dog1 = dogs.at(0);
    let dogPerson1 = await dog1.pal;
    assert.strictEqual(
      dogPerson1.id,
      '1',
      'dog.person inverse relationship is set up correctly when adapter does not include parent relationships in data.relationships'
    );
    let dogPerson2 = await dogs.at(1).pal;
    assert.strictEqual(
      dogPerson2.id,
      '1',
      'dog.person inverse relationship is set up correctly when adapter does not include parent relationships in data.relationships'
    );

    await dog1.destroyRecord();
    assert.strictEqual(dogs.length, 1, 'record removed from hasMany relationship after deletion');
    assert.strictEqual(dogs.at(0).id, '2', 'hasMany relationship has correct records');
  });

  test('one-to-many (left hand async, right hand sync) - ids/non-link/explicit inverse - ids - records loaded through ids/findRecord are linked to the parent if the response from the server does not include relationship information', async function (assert) {
    let { owner } = this;

    const scooby = {
      id: '1',
      type: 'dog',
      attributes: {
        name: 'Scooby',
      },
    };

    const scrappy = {
      id: '2',
      type: 'dog',
      attributes: {
        name: 'Scrappy',
      },
    };

    owner.register(
      'adapter:application',
      JSONAPIAdapter.extend({
        deleteRecord: () => Promise.resolve({ data: null }),
        findRecord: (_store, _type, id) => {
          const dog = id === '1' ? scooby : scrappy;
          return Promise.resolve({
            data: dog,
          });
        },
      })
    );

    class Person extends Model {
      @hasMany('dog', {
        async: true,
        inverse: 'pal',
      })
      dogs;
    }
    owner.register('model:person', Person);

    class Dog extends Model {
      @belongsTo('person', {
        async: false,
        inverse: 'dogs',
      })
      pal;
    }
    owner.register('model:dog', Dog);

    let person = store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: 'John Churchill',
        },
        relationships: {
          dogs: {
            data: [
              {
                id: '1',
                type: 'dog',
              },
              {
                id: '2',
                type: 'dog',
              },
            ],
          },
        },
      },
    });

    let dogs = await person.dogs;
    assert.false(person.hasMany('dogs').hasManyRelationship.state.isEmpty, 'relationship state was set up correctly');

    assert.strictEqual(dogs.length, 2, 'hasMany relationship has correct number of records');
    let dog1 = dogs.at(0);
    let dogPerson1 = await dog1.pal;
    assert.strictEqual(
      dogPerson1.id,
      '1',
      'dog.person inverse relationship is set up correctly when adapter does not include parent relationships in data.relationships'
    );
    let dogPerson2 = await dogs.at(1).pal;
    assert.strictEqual(
      dogPerson2.id,
      '1',
      'dog.person inverse relationship is set up correctly when adapter does not include parent relationships in data.relationships'
    );

    await dog1.destroyRecord();
    assert.strictEqual(dogs.length, 1, 'record removed from hasMany relationship after deletion');
    assert.strictEqual(dogs.at(0).id, '2', 'hasMany relationship has correct records');
  });

  test('one-to-many - ids/non-link/null inverse - ids - records loaded through ids/findRecord are linked to the parent if the response from the server does not include relationship information', async function (assert) {
    let { owner } = this;

    const scooby = {
      id: '1',
      type: 'dog',
      attributes: {
        name: 'Scooby',
      },
    };

    const scrappy = {
      id: '2',
      type: 'dog',
      attributes: {
        name: 'Scrappy',
      },
    };

    owner.register(
      'adapter:application',
      JSONAPIAdapter.extend({
        deleteRecord: () => Promise.resolve({ data: null }),
        findRecord: (_store, _type, id) => {
          const dog = id === '1' ? scooby : scrappy;
          return Promise.resolve({
            data: dog,
          });
        },
      })
    );

    class Person extends Model {
      @hasMany('dog', {
        async: true,
        inverse: null,
      })
      dogs;
    }
    owner.register('model:person', Person);

    class Dog extends Model {}
    owner.register('model:dog', Dog);

    let person = store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: 'John Churchill',
        },
        relationships: {
          dogs: {
            data: [
              {
                id: '1',
                type: 'dog',
              },
              {
                id: '2',
                type: 'dog',
              },
            ],
          },
        },
      },
    });

    let dogs = await person.dogs;
    assert.false(person.hasMany('dogs').hasManyRelationship.state.isEmpty, 'relationship state was set up correctly');

    assert.strictEqual(dogs.length, 2, 'hasMany relationship has correct number of records');
    let dog1 = dogs.at(0);

    await dog1.destroyRecord();
    assert.strictEqual(dogs.length, 1, 'record removed from hasMany relationship after deletion');
    assert.strictEqual(dogs.at(0).id, '2', 'hasMany relationship has correct records');
  });

  test('one-to-many - ids/non-link/explicit inverse - records loaded through ids/findRecord do not get associated with the parent if the server specifies another resource as the relationship value in the response', async function (assert) {
    let { owner } = this;

    const scooby = {
      id: '1',
      type: 'dog',
      attributes: {
        name: 'Scooby',
      },
      relationships: {
        pal: {
          data: {
            id: '2',
            type: 'pal',
          },
        },
      },
    };

    const scrappy = {
      id: '2',
      type: 'dog',
      attributes: {
        name: 'Scrappy',
      },
      relationships: {
        pal: {
          data: {
            id: '2',
            type: 'pal',
          },
        },
      },
    };

    owner.register(
      'adapter:application',
      JSONAPIAdapter.extend({
        deleteRecord: () => Promise.resolve({ data: null }),
        findRecord: (_store, _type, id) => {
          const dog = id === '1' ? scooby : scrappy;
          return Promise.resolve({
            data: dog,
          });
        },
      })
    );

    class Person extends Model {
      @hasMany('dog', {
        async: true,
        inverse: 'pal',
      })
      dogs;
    }
    owner.register('model:pal', Person);

    class Dog extends Model {
      @belongsTo('pal', {
        async: true,
        inverse: 'dogs',
      })
      pal;
    }
    owner.register('model:dog', Dog);

    let pal = store.push({
      data: {
        type: 'pal',
        id: '1',
        attributes: {
          name: 'John Churchill',
        },
        relationships: {
          dogs: {
            data: [
              {
                id: '1',
                type: 'dog',
              },
              {
                id: '2',
                type: 'dog',
              },
            ],
          },
        },
      },
    });

    let pal2 = store.push({
      data: {
        type: 'pal',
        id: '2',
        attributes: {
          name: 'ok',
        },
      },
    });

    let dogs = await pal.dogs;
    assert.false(pal.hasMany('dogs').hasManyRelationship.state.isEmpty, 'relationship state was set up correctly');

    assert.strictEqual(dogs.length, 0, 'hasMany relationship for parent is empty');

    let pal2Dogs = await pal2.dogs;
    assert.strictEqual(
      pal2Dogs.length,
      2,
      'hasMany relationship on specified record has correct number of associated records'
    );

    let allDogs = store.peekAll('dogs').slice();
    for (let i = 0; i < allDogs.length; i++) {
      let dog = allDogs[i];
      let dogPerson = await dog.pal;
      assert.strictEqual(dogPerson.id, pal2.id, 'right hand side has correct belongsTo value');
    }

    let dog1 = store.peekRecord('dog', '1');
    await dog1.destroyRecord();
    assert.strictEqual(pal2Dogs.length, 1, 'record removed from hasMany relationship after deletion');
    assert.strictEqual(pal2Dogs.at(0).id, '2', 'hasMany relationship has correct records');
  });

  test('one-to-many (left hand async, right hand sync) - ids/non-link/explicit inverse - records loaded through ids/findRecord do not get associated with the parent if the server specifies another resource as the relationship value in the response', async function (assert) {
    let { owner } = this;

    const scooby = {
      id: '1',
      type: 'dog',
      attributes: {
        name: 'Scooby',
      },
      relationships: {
        pal: {
          data: {
            id: '2',
            type: 'pal',
          },
        },
      },
    };

    const scrappy = {
      id: '2',
      type: 'dog',
      attributes: {
        name: 'Scrappy',
      },
      relationships: {
        pal: {
          data: {
            id: '2',
            type: 'pal',
          },
        },
      },
    };

    owner.register(
      'adapter:application',
      JSONAPIAdapter.extend({
        deleteRecord: () => Promise.resolve({ data: null }),
        findRecord: (_store, _type, id) => {
          const dog = id === '1' ? scooby : scrappy;
          return Promise.resolve({
            data: dog,
          });
        },
      })
    );

    class Person extends Model {
      @hasMany('dog', {
        async: true,
        inverse: 'pal',
      })
      dogs;
    }
    owner.register('model:pal', Person);

    class Dog extends Model {
      @belongsTo('pal', {
        async: false,
        inverse: 'dogs',
      })
      pal;
    }
    owner.register('model:dog', Dog);

    let pal = store.push({
      data: {
        type: 'pal',
        id: '1',
        attributes: {
          name: 'John Churchill',
        },
        relationships: {
          dogs: {
            data: [
              {
                id: '1',
                type: 'dog',
              },
              {
                id: '2',
                type: 'dog',
              },
            ],
          },
        },
      },
    });

    let pal2 = store.push({
      data: {
        type: 'pal',
        id: '2',
        attributes: {
          name: 'ok',
        },
      },
    });

    let dogs = await pal.dogs;
    assert.false(pal.hasMany('dogs').hasManyRelationship.state.isEmpty, 'relationship state was set up correctly');

    assert.strictEqual(dogs.length, 0, 'hasMany relationship for parent is empty');

    let pal2Dogs = await pal2.dogs;
    assert.strictEqual(
      pal2Dogs.length,
      2,
      'hasMany relationship on specified record has correct number of associated records'
    );

    let allDogs = store.peekAll('dogs').slice();
    for (let i = 0; i < allDogs.length; i++) {
      let dog = allDogs[i];
      let dogPerson = await dog.pal;
      assert.strictEqual(dogPerson.id, pal2.id, 'right hand side has correct belongsTo value');
    }

    let dog1 = store.peekRecord('dog', '1');
    await dog1.destroyRecord();
    assert.strictEqual(pal2Dogs.length, 1, 'record removed from hasMany relationship after deletion');
    assert.strictEqual(pal2Dogs.at(0).id, '2', 'hasMany relationship has correct records');
  });

  test("loading belongsTo doesn't remove inverse relationship for other instances", async function (assert) {
    let { owner } = this;

    const scooby = {
      id: '1',
      type: 'dog',
      attributes: {
        name: 'Scooby',
      },
      relationships: {
        person: {
          data: { id: '1', type: 'person' },
          links: { related: 'http://example.com/dogs/1/person' },
        },
      },
    };
    const scrappy = {
      id: '2',
      type: 'dog',
      attributes: {
        name: 'Scrappy',
      },
      relationships: {
        person: {
          data: { id: '1', type: 'person' },
          links: { related: 'http://example.com/dogs/1/person' },
        },
      },
    };
    owner.register(
      'adapter:application',
      JSONAPIAdapter.extend({
        deleteRecord: () => Promise.resolve({ data: null }),
        findBelongsTo: () => {
          return Promise.resolve({
            data: {
              type: 'person',
              id: '1',
              attributes: {
                name: 'John Churchill',
              },
              relationships: {
                dogs: {
                  links: {
                    related: 'http://example.com/person/1/dogs',
                  },
                },
              },
            },
          });
        },
        findRecord: (_store, _type, id) => {
          const dog = id === '1' ? scooby : scrappy;
          return Promise.resolve({
            data: dog,
          });
        },
      })
    );

    class Person extends Model {
      @hasMany('dog', {
        async: false,
        inverse: 'person',
      })
      dogs;
    }

    owner.register('model:person', Person);

    class Dog extends Model {
      @belongsTo('person', {
        async: true,
        inverse: 'dogs',
      })
      person;

      @attr('string')
      name;
    }

    owner.register('model:dog', Dog);

    // load em into store
    let dog1 = await owner.lookup('service:store').findRecord('dog', '1');
    let dog2 = await owner.lookup('service:store').findRecord('dog', '2');

    assert.strictEqual(dog1.belongsTo('person').id(), '1');
    assert.strictEqual(dog2.belongsTo('person').id(), '1');

    await dog1.person;

    assert.strictEqual(dog1.belongsTo('person').id(), '1');
    assert.strictEqual(dog2.belongsTo('person').id(), '1');
  });
});
