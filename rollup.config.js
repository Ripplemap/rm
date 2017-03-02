import json from 'rollup-plugin-json'
import babel from 'rollup-plugin-babel'
import includePaths from 'rollup-plugin-includepaths'

var includePathOptions = { include:    {}
                         , paths:      ['modules']
                         , external:   []
                         , extensions: ['.js', '.json', '.html']
                         }

export default { entry:     'main.js'
               , dest:      'bundle.js' // equivalent to --output
               , format:    'cjs'
               , plugins:   [ includePaths(includePathOptions), json(), babel() ]
               , sourceMap: true
               // , treeshake : false
               }
