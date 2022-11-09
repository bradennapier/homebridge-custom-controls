# State Behavior Protocol

This behavior protocol is meant to provide a universal protocol for handling STATE (On/Off) transitions by providing a `.stateSet(_:boolean)`.

As an example, for simple values with `On` Characteristic, it is quite simple but for `Lock` accessories, we require a TARGET AND CURRENT state handler. Sometimes we want to use that but sometimes we just want to treat them the same way as regular binary switches.

We can implement this behavior by adapting to the AbstractStateBehavior.

## Capturing Child Characteristics

While the behavior handles receiving and acting upon the characteristics, sometimes we need to use them in other peers that depend on the behavior. We implement that with `getType`,

```ts
const stateChara = this.getType(BehaviorTypes.STATE).get((type) => type.On);
```
