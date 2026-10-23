<?php

namespace app\domain\maven;

class ArchivedArtifact
{
    private string $lastVersion;

    private string $groupId;

    private string $artifactId;

    public function __construct(string $lastVersion, string $groupId, string $artifactId)
    {
        $this->lastVersion = $lastVersion;
        $this->groupId = $groupId;
        $this->artifactId = $artifactId;
    }

    public function getLastVersion(): string
    {
        return $this->lastVersion;
    }

    public function getGroupId(): string
    {
        return $this->groupId;
    }

    public function getArtifactId(): string
    {
        return $this->artifactId;
    }
}
