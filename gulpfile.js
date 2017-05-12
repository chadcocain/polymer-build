/**
 * @license
 * Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

'use strict';

const depcheck = require('depcheck');
const fs = require('fs-extra');
const gulp = require('gulp');
const mergeStream = require('merge-stream');
const mocha = require('gulp-spawn-mocha');
const path = require('path');
const runSeq = require('run-sequence');
const stream = require('stream');
const tslint = require('gulp-tslint');
const typescript = require('gulp-typescript');

const tsProject = typescript.createProject(
    'tsconfig.json', {typescript: require('typescript')});

gulp.task('lint', ['tslint', 'depcheck']);

gulp.task('clean', (done) => {
  fs.remove(path.join(__dirname, 'lib'), done);
});

gulp.task('build', ['clean'], () => {
  let tsReporter = typescript.reporter.defaultReporter();
  return mergeStream(
             tsProject.src().pipe(tsProject(tsReporter)),
             gulp.src(['src/**/*', '!src/**/*.ts']))
      .pipe(gulp.dest('lib'));
});

gulp.task('test', ['build'], function() {
  return gulp.src('lib/test/**/*_test.js', {read: false}).pipe(mocha({
    ui: 'tdd',
    reporter: 'spec',
  }))
});

gulp.task('tslint', function() {
  return gulp.src('src/**/*.ts')
      .pipe(tslint({configuration: 'tslint.json', formatter: 'verbose'}))
      .pipe(tslint.report())
});

gulp.task('depcheck', function() {
  return depcheck(__dirname, {
    ignoreMatches: [
      // "@types/*" dependencies are type declarations that are
      // automatically loaded by TypeScript during build. depcheck can't
      // detect this so we ignore them here.

      '@types/*',
      // Also it can't yet parse files that use async iteration.
      // TODO(rictic): remove these
      'mz', 'multipipe', 'polymer-bundler',
  ]}).then((result) => {
    let invalidFiles = Object.keys(result.invalidFiles) || [];
    let invalidJsFiles = invalidFiles.filter((f) => f.endsWith('.js'));
    if (invalidJsFiles.length > 0) {
      throw new Error(`Invalid files: ${invalidJsFiles}`);
    }
    if (result.dependencies.length) {
      throw new Error(`Unused dependencies: ${result.dependencies}`);
    }
  });
});
