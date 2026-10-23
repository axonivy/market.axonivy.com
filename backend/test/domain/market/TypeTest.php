<?php

namespace test\domain\market;

use PHPUnit\Framework\Assert;
use PHPUnit\Framework\TestCase;
use app\domain\market\Type;

class TypeTest extends TestCase
{

  public function test_types()
  {
    $types = Type::all();
    $expectedTypes = [
      new Type('All Types', '', 'si-types'),
      new Type('Connectors', 'connector', 'si-connector'),
      //new Type('Process Models', 'process', 'si-diagram'),
      new Type('Solutions', 'solution', 'si-lab-flask'),
      new Type('Utils', 'util', 'si-util')
    ];
    Assert::assertEquals($expectedTypes, $types);
  }
}
