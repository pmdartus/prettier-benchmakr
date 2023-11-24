#!/bin/bash

# Get github repo HTTP URL from shorthand reference
#  e.g. "prettier/prettier#master" -> "https://github.com/prettier/prettier.git"
get_github_repo_url() {
    local shorthand_reference=$1
    local owner=$(echo "$shorthand_reference" | cut -d'/' -f1)
    local repo=$(echo "$shorthand_reference" | cut -d'/' -f2 | cut -d'#' -f1)
    echo "https://github.com/$owner/$repo.git"
}

# Get github refence from shorthand reference
#  e.g. "prettier/prettier#master" -> "master"
get_github_reference() {
    local shorthand_reference=$1
    local ref=$(echo "$shorthand_reference" | cut -d'#' -f2)
    echo "$ref"
}

# Install prettier from git repo. 
# The git repo is cloned into the provided directory name and the provided git reference is checked out.
install_prettier_from_git() {
    local directory_name=$1
    local shorthand_reference=$2

    local github_repo_url=$(get_github_repo_url "$shorthand_reference")
    local github_reference=$(get_github_reference "$shorthand_reference")

    git clone "$github_repo_url" "$directory_name"
    cd "$directory_name"
    git checkout "$github_reference"

    yarn install
    yarn build
    cd ..
}

# Check if the provided argument is a directory name and git repo reference
if [[ "$1" && "$2" ]]; then
    install_prettier_from_git "$1" "$2"
else
    echo "Invalid argument. Please provide a directory name and a git repo reference."
    exit 1
fi
