declare module 'jsdom' {
  export class JSDOM {
    window: {
      DOMParser: typeof DOMParser;
      XMLSerializer: typeof XMLSerializer;
    };

    constructor(html?: string);
  }
}
