pipeline {
  agent any

  triggers {
    cron 'H 22 * * *'
  }

  options {
    buildDiscarder(logRotator(numToKeepStr: '120', artifactNumToKeepStr: '3'))
    skipStagesAfterUnstable()
  }

  stages {
    stage('build') {
      steps {
        script {
          docker.build('node', '-f build/Dockerfile.node .').inside {
            dir ('frontend') {
              sh 'pnpm install'
              sh 'pnpm cache:clean'
              withCredentials([string(credentialsId: 'github.market.token', variable: 'GITHUB_TOKEN')]) {
                sh 'pnpm build'
              }
              sh 'pnpm typecheck'
            }
          }

          archiveArtifacts 'frontend/dist/**/*'
          currentBuild.description = "<a href='${BUILD_URL}artifact/frontend/dist/index.html'>Market 🛍️</a>"
        }

      }
    }

    stage('Protocol') {
      steps {
        script {
          docker.build('node', '-f build/Dockerfile.node .').inside {
            dir ('frontend') {
              sh 'pnpm run generate:meta'
              sh 'pnpm run typecheck'
            }
          }
        }
      }
    }

    stage('Test') {
      steps {
        script {
          docker.build('node', '-f build/Dockerfile.node .').inside {
            dir ('frontend') {
              sh 'pnpm run test'
              withChecks('Frontend Tests') {
                junit testDataPublishers: [[$class: 'StabilityTestDataPublisher']], testResults: 'report.xml'
              }
            }
          }
        }
      }
    }

    stage('Backend Tests') {
      steps {
        script {
          docker.build('composer', '-f build/Dockerfile.composer .').inside('--entrypoint=""') {
            dir ('backend') {
              sh 'composer install --no-interaction --no-progress'
            }
          }

          docker.build('php', '-f backend/docker/apache/Dockerfile backend/docker/apache').inside("-v ${env.WORKSPACE}/frontend/.market:/market:ro") {
            dir ('backend') {
              def testExitCode = sh(
                script: './vendor/bin/phpunit --log-junit phpunit-junit.xml',
                returnStatus: true
              )
              withChecks('Backend Tests') {
                junit testDataPublishers: [[$class: 'StabilityTestDataPublisher']], testResults: 'phpunit-junit.xml'
              }
              if (testExitCode != 0) {
                error("Backend tests failed with exit code ${testExitCode}")
              }
            }
          }
        }
      }
    }

    stage('Package') {
      steps {
        script {
          docker.build('composer', '-f build/Dockerfile.composer .').inside('--entrypoint=""') {
            dir ('backend') {
              sh 'composer install --no-dev --no-interaction --no-progress'
            }
          }
        }

        sh 'bash build/package-market.sh'
        archiveArtifacts 'build/ivy-website-market.tar'
      }
    }

    stage('Playwright Tests') {
      steps {
        script {
          catchError(buildResult: 'UNSTABLE', stageResult: 'UNSTABLE') {
            docker.build('node-webtest', '-f build/Dockerfile.playwright .').inside {
              dir ('frontend') {
                withCredentials([string(credentialsId: 'github.market.token', variable: 'GITHUB_TOKEN')]) {
                  sh 'pnpm run test:e2e'
                }
                withChecks('End2End Tests') {
                  junit testDataPublishers: [[$class: 'StabilityTestDataPublisher']], testResults: 'report-e2e.xml'
                }
              }
            }
          }
          archiveArtifacts artifacts: 'frontend/test-results/**, frontend/playwright-report/**', allowEmptyArchive: true
        }
      }
    }

    stage('SBOM') {
      when {
        branch 'master'
      }

      steps {
        script {
          docker.build('node-webtest', '-f build/Dockerfile.playwright .').inside {
            dir ('frontend') {
              sh 'pnpm run sbom'
            }
          }

          docker.build('composer', '-f build/Dockerfile.composer .').inside('--entrypoint=""') {
            dir ('backend') {
              sh 'composer install --no-interaction --no-progress'
              sh 'composer config allow-plugins.cyclonedx/cyclonedx-php-composer true'
              sh 'composer require --dev cyclonedx/cyclonedx-php-composer --no-interaction --no-progress'
              sh 'composer CycloneDX:make-sbom --output-format=JSON --output-file=bom.json'
            }
          }

          sh 'docker run --rm -v "$WORKSPACE:/sbom" cyclonedx/cyclonedx-cli merge --hierarchical --name market.axonivy.com --version master --input-files /sbom/backend/bom.json /sbom/frontend/bom.json --output-file /sbom/full-sbom.json'
          uploadBOM(projectName: 'market.axonivy.com', projectVersion: 'master', bomFile: 'full-sbom.json')
        }
      }
    }

    stage('deploy') {
      when {
        branch 'master'
      }
      steps {
        script {
          docker.image('axonivy/build-container:ssh-client-1').inside {
            sshagent(['zugprojenkins-ssh']) {
              def targetFolder = "/home/axonivya/deployment/ivy-website-market-" + new Date().format("yyyy-MM-dd_HH-mm-ss-SSS");
              def targetFile =  targetFolder + ".tar"
              def host = 'axonivya@dev.axonivy.com'

              // copy
              sh "scp build/ivy-website-market.tar $host:$targetFile"

              // untar
              sh "ssh $host mkdir $targetFolder"
              sh "ssh $host tar -xf $targetFile -C $targetFolder"
              sh "ssh $host rm -f $targetFile"

              // symlink
              sh "ssh $host ln -fns $targetFolder/src/web /home/axonivya/www/axonivya.myhostpoint.ch/linktoweb"
            }
          }
        }
      }
    }
  }
}