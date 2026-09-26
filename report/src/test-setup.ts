// jsdom does not implement layout APIs.
Element.prototype.scrollIntoView ??= () => {};
