// Maps the 'plotly.js-dist-min' runtime import to the @types/plotly.js type declarations.
declare module 'plotly.js-dist-min' {
  import Plotly from 'plotly.js'
  export = Plotly
}
