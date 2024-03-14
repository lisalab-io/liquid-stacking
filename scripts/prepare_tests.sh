#!/bin/bash

find . -type f -name "*.clar" -exec \
  sed -i 's/SP000000000000000000002Q6VF78/ST000000000000000000002AMW42H/g' {} \;