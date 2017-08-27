import json

def transitive_closure(dependency_tree, builds):
    closure = builds

    add_to_builds_in_closure = True
    while add_to_builds_in_closure:
        length_of_closure = len(closure)
        closure.update(set([
            build for build in dependency_tree
            if any((dependent in closure) for dependent in dependency_tree[build])
        ]))
        add_to_builds_in_closure = length_of_closure < len(closure)

    return dict([(build, dependency_tree[build].intersection(closure)) for build in closure])

def builds_that_can_be_built(dependency_tree, already_built):
    return set([build for build in dependency_tree
                if all((dependent in already_built) for dependent in dependency_tree[build])])\
                .difference(already_built)

def serialize(dependency_tree):
    return json.dumps(dict([(build, list(dependents))
                            for (build, dependents) in dependency_tree.items()]))

def deserialize(json_string):
    d = json.loads(json_string)
    return dict([(build, set(dependents))
                 for (build, dependents) in d.items()])
