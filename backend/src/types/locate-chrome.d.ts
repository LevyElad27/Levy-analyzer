declare module 'locate-chrome' {
  function locateChrome(): Promise<string | null>;
  export = locateChrome;
} 