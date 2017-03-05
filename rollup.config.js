import json from 'rollup-plugin-json'
import babel from 'rollup-plugin-babel'
import includePaths from 'rollup-plugin-includepaths'

import postcss from 'rollup-plugin-postcss'
import nodeResolve from 'rollup-plugin-node-resolve'

// post css plugins:
import simplevars from 'postcss-simple-vars'
import nested from 'postcss-nested'
import cssnext from 'postcss-cssnext'
import cssnano from 'cssnano'

var includePathOptions = { include:    {}
                         , paths:      ['js']
                         , external:   []
                         , extensions: ['.js', '.json', '.html']
                         }

export default { sourceMap: true
               , format:    'cjs'
               , entry:     './src/main.js'
               , dest:      './build/bundle.js' // equivalent to --output
               , plugins: [ includePaths(includePathOptions)
                          , nodeResolve({jsnext: true})
                          , json()
                          , postcss({ extensions: ['.css']
                                    , plugins: [ simplevars()
                                               , nested()
                                               , cssnano()
                                               , cssnext({warnForDuplicates: false})
                                               ]
                                    })
                          , babel({ babelrc: false
                                  , presets: [ "es2015-rollup"]
                                  , plugins: [ ['transform-react-jsx', { pragma:'h' }]
                                             , ["transform-class-properties"]
                                             ]
                                  // exclude: 'node_modules/**',
                                  })
                          ]
               }
