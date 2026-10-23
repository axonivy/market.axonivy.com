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
              withCredentials([string(credentialsId: 'github.market.token', variable: 'GITHUB_TOKEN')]) {
                sh 'pnpm build'
              }
              sh 'pnpm typecheck'
            }
          }

          archiveArtifacts 'frontend/dist/**/*'
          currentBuild.description = "<a href='${BUILD_URL}artifact/frontend/dist/index.html'>Market 🛍️</a>"
        }

        dir ('frontend') {
          sh 'tar -cf ivy-website-market.tar dist'
          archiveArtifacts 'ivy-website-market.tar'
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
          docker.build('php', '-f backend/docker/apache/Dockerfile backend').inside {
            dir ('backend') {
              sh 'composer install --no-interaction --no-progress'
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
          uploadBOM(projectName: 'market.axonivy.com', projectVersion: 'master', bomFile: 'frontend/bom.json')
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
              sh "scp frontend/ivy-website-market.tar $host:$targetFile"

              // untar
              sh "ssh $host mkdir $targetFolder"
              sh "ssh $host tar -xf $targetFile -C $targetFolder"
              sh "ssh $host rm -f $targetFile"

              // symlink
              sh "ssh $host ln -fns $targetFolder/dist /home/axonivya/www/axonivya.myhostpoint.ch/linktoweb"
            }
          }
        }
      }
    }
  }
}