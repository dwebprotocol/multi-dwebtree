# Merge Handler

All the calls to Merge Handler are done by MultiDTree. That means that if you want to use your own Merge Handler, it needs to be passed as a parameter to MultiDTree like this:

```
const multiHyperbee = new MultiDTree(storage, [options], customMergeHandler)
```

MyltiHyperbee calls MergeHandler in these cases:

1. the **diff** object hits one of the replica peer and the **store** object needs to be updated with the new changes. In this case the call would be:

```
await mergeHandler.merge(diff)
```

2. `multiHyperbee.put(key, object)` will call `mergeHandler.genDiff(oldValue, newValue)` if the **diff** object was not found in the **object**. In this case **diff** object will be generated based on differences between the **object** and it's last version in store.
The **diff** object will have a key `key/_timestamp`. This way it'll be easy to find the **store** and/or **diff** object that correspond to the same **_timestamp**

_Note_ **diff** object could be passed as **_diff** property of the **object**. It will be deleted from **object** before put of the **object** is executed.


All the calls to Merge Handler are done by MultiDTree. Which means that if you write your own Merge Handler, it is need to be passed as a parameter to MultiDTree like this:

```
const multihyperbee = new MultiDTree(s, [options], customMergeHandler)
```

## API

#### `const mergeHandle = new MergeHandler(store)`
Creates an instance of the Merge Handler for a particular multiHyperbee.
`store` is a MultiDTree instance

#### `await mergeHandler.merge(diff)`
Finds the object corresponding to **__objectId** in **diff** object and performs the merge. Algorithm below

#### `const diffObject = genDiff(oldValue, newValue)`
Generates **diff** object when multi-dwebtree **put** is called and no **_diff** object was passed with the **store** object

## Algorithm for the default Merge Handler

1. find the last version of the **store** object corresponding to the **diff** by _objectId.
2. if the timestamp of the **diff** object is bigger than the one of the **store** object
    - merge the **diff** to the **store** object
3. Otherwise:
    - find all the **diff** objects on all the peers from the **diff** object timestamp
    - finds the version of the store **object** with the same timestamp as **diff** object
    - merge all found **diff(s)** to the found **store** object
    - creates new **store** objects with each applied **diff**

This creates a fork from the previous sequence of changes of the store objects

## Diff object schema

_Note_ the `property` in schema below corresponds to the `property` that is changed in store **object**.

``` js
  const diffSchema = {
    _timestamp: 'string', // _timestamp has the same value as the store object the diff corresponds to
    obj: {
      _objectId: 'string',
      _prevTimestamp: 'string'
    },
    list: {
      add: {
        // value of the property can be primitive JSON types or JSON object or any arrays
        property: 'any type',
      },
      remove: {
        // value of the property can be any string but it's value is not used in any way
        property: ''
      },
      insert: {
        // could be insert in some value like object or array,
        // otherwise will work the same way as add on top level
        add: {
          property: 'object',
          // ARRAY
          property: [
            {
              before: 'some value in array',
              after: 'some value in array',
              index: 'number'
            }
          ]
        },
        remove: {
          property: 'JSON object or Array'
        }
      }
    }
  }
```

