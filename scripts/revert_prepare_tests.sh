#!/bin/bash

find . -type f -name "*.clar" -exec \
  sed -i 's/ST000000000000000000002AMW42H/SP000000000000000000002Q6VF78/g' {} \;