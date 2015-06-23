'use strict';

module.exports = function (grunt) {
    // grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.config.set('watch', {
        source: {
            files: ['src/**/*.js'],
            tasks: ['browserify:edge', 'browserify:tests:', 'browserify:instrumented:','mocha:test', 'coverage-report']
        },
        tests: {
            files: ['tests/specs/**/*.js', 'tests/specs/*.js', 'tests/*.js', '!tests/dist/*'],
            tasks: ['browserify:tests:', 'browserify:instrumented:', 'mocha:test', 'coverage-report']
        }
    });
};